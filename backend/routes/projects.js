const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate, requireAdmin, attachRole } = require('../middleware/auth');

// All project routes require auth
router.use(authenticate);

// GET /api/projects — list all projects the user belongs to
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create a project (creator becomes admin)
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Project name required'),
    body('description').optional().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const proj = await client.query(
        'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description || null, req.user.id]
      );
      const project = proj.rows[0];

      // Auto-add creator as admin
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [project.id, req.user.id, 'admin']
      );

      await client.query('COMMIT');
      res.status(201).json({ project: { ...project, role: 'admin' } });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// GET /api/projects/:projectId
router.get('/:projectId', attachRole, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as owner_name FROM projects p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [req.params.projectId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [req.params.projectId]
    );

    res.json({
      project: result.rows[0],
      members: members.rows,
      userRole: req.userRole,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:projectId — admin only
router.put('/:projectId', requireAdmin, async (req, res, next) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name, description, req.params.projectId]
    );
    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId — admin only
router.delete('/:projectId', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.projectId]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/members — admin only, add member by email
router.post('/:projectId/members', requireAdmin, async (req, res, next) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const user = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found. They need to sign up first.' });

    const targetUser = user.rows[0];

    // Check if already a member
    const existing = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.projectId, targetUser.id]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'User is already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [req.params.projectId, targetUser.id, role]
    );

    res.status(201).json({ member: { ...targetUser, role } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/members/:userId — admin only
router.delete('/:projectId/members/:userId', requireAdmin, async (req, res, next) => {
  const { userId } = req.params;
  // Can't remove project owner
  const proj = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [req.params.projectId]);
  if (proj.rows[0].owner_id == userId) {
    return res.status(400).json({ error: 'Cannot remove project owner' });
  }

  try {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.projectId, userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
