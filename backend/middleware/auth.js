const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Attaches req.user if token is valid
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.userId]);
    if (!result.rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if the authenticated user is an admin of a given project
// Expects req.params.projectId to be set
const requireAdmin = async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    if (result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userRole = 'admin';
    next();
  } catch (err) {
    next(err);
  }
};

// Attach role to req without blocking — useful for conditional UI logic
const attachRole = async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    req.userRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireAdmin, attachRole };
