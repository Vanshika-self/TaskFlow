const router = require('express').Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboard — summary stats for the current user
router.get('/', async (req, res, next) => {
  const userId = req.user.id;
  try {
    // Tasks assigned to me, by status
    const myTaskStats = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM tasks
       WHERE assigned_to = $1
       GROUP BY status`,
      [userId]
    );

    // Overdue tasks assigned to me
    const overdue = await pool.query(
      `SELECT t.*, p.name as project_name, u.name as assignee_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.assigned_to = $1
         AND t.due_date < CURRENT_DATE
         AND t.status != 'done'
       ORDER BY t.due_date ASC`,
      [userId]
    );

    // Recent tasks across my projects
    const recentTasks = await pool.query(
      `SELECT t.*, p.name as project_name, u.name as assignee_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       LEFT JOIN users u ON u.id = t.assigned_to
       ORDER BY t.updated_at DESC
       LIMIT 10`,
      [userId]
    );

    // Project count
    const projectCount = await pool.query(
      'SELECT COUNT(*) FROM project_members WHERE user_id = $1',
      [userId]
    );

    // Build a status map
    const statusMap = { todo: 0, in_progress: 0, done: 0 };
    myTaskStats.rows.forEach((r) => {
      statusMap[r.status] = parseInt(r.count);
    });

    res.json({
      stats: {
        projectCount: parseInt(projectCount.rows[0].count),
        myTasks: statusMap,
        totalMyTasks: statusMap.todo + statusMap.in_progress + statusMap.done,
        overdueCount: overdue.rows.length,
      },
      overdueTasks: overdue.rows,
      recentTasks: recentTasks.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
