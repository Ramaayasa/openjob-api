const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');

const getProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getProfileApplications = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT a.*, j.title AS job_title, c.name AS company_name
       FROM applications a
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [userId]
    );

    return sendSuccess(res, 200, { applications: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getProfileBookmarks = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT b.*, j.title AS job_title, c.name AS company_name
       FROM bookmarks b
       LEFT JOIN jobs j ON b.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [userId]
    );

    return sendSuccess(res, 200, { bookmarks: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { getProfile, getProfileApplications, getProfileBookmarks };
