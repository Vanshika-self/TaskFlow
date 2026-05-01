const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate, attachRole, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(attachRole); // attach role for all task routes

// GET /api/projects/:projectId/tasks
router.get('/', async (req, res, next) => {
  const { status, assignedTo, priority } = req.query;
  try {
    let query = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email,
        c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) { query += ` AND t.status = $${params.length + 1}`; params.push(status); }
    if (assignedTo) { query += ` AND t.assigned_to = $${params.length + 1}`; params.push(assignedTo); }
    if (priority) { query += ` AND t.priority = $${params.length + 1}`; params.push(priority); }

    query += ` ORDER BY 
      CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/tasks — any member can create tasks
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 2 }).withMessage('Task title required'),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('due_date').optional().isISO8601(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, status, priority, due_date, assigned_to } = req.body;

    // Validate assigned_to is a project member
    if (assigned_to) {
      const isMember = await pool.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [req.params.projectId, assigned_to]
      );
      if (!isMember.rows.length) {
        return res.status(400).json({ error: 'Assigned user is not a project member' });
      }
    }

    try {
      const result = await pool.query(
        `INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          title,
          description || null,
          status || 'todo',
          priority || 'medium',
          due_date || null,
          req.params.projectId,
          assigned_to || null,
          req.user.id,
        ]
      );
      res.status(201).json({ task: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/projects/:projectId/tasks/:taskId — update status, assignment, etc
router.patch('/:taskId', async (req, res, next) => {
  const { taskId, projectId } = req.params;
  const { title, description, status, priority, due_date, assigned_to } = req.body;

  // Members can update status; only admins can reassign
  if (assigned_to !== undefined && req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reassign tasks' });
  }

  try {
    // Check task belongs to project
    const existing = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND project_id = $2',
      [taskId, projectId]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Task not found' });

    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, due_date, assigned_to, taskId]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId — admin only
router.delete('/:taskId', requireAdmin, async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND project_id = $2',
      [req.params.taskId, req.params.projectId]
    );
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
