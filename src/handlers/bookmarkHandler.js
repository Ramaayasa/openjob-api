const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { client: redis } = require('../utils/redis');

const CACHE_TTL = 3600;

const createBookmark = async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  try {
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return sendFailed(res, 404, 'Job not found');
    }

    const existing = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );
    if (existing.rows.length > 0) {
      return sendFailed(res, 400, 'Job already bookmarked');
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO bookmarks (id, user_id, job_id) VALUES ($1, $2, $3)',
      [id, userId, jobId]
    );

    try { await redis.del(`bookmarks:user:${userId}`); } catch (e) { /* ignore */ }

    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllUserBookmarks = async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `bookmarks:user:${userId}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: { bookmarks: JSON.parse(cached) } });
      }
    } catch (e) { /* ignore */ }

    const result = await pool.query(
      `SELECT b.id, b.user_id, b.job_id, b.created_at,
              j.title AS job_title, j.job_type, j.status AS job_status,
              j.description AS job_description, j.experience_level, j.location_type,
              j.location_city, j.salary_min, j.salary_max, j.is_salary_visible,
              j.company_id, j.category_id, j.created_at AS job_created_at,
              c.name AS company_name
       FROM bookmarks b
       LEFT JOIN jobs j ON b.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [userId]
    );

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: { bookmarks: result.rows } });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getBookmarkById = async (req, res) => {
  const { jobId, id } = req.params;
  try {
    const result = await pool.query(
      `SELECT b.*, j.title AS job_title
       FROM bookmarks b
       LEFT JOIN jobs j ON b.job_id = j.id
       WHERE b.id = $1 AND b.job_id = $2`,
      [id, jobId]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Bookmark not found');
    }

    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteBookmark = async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  try {
    const existing = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );

    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Bookmark not found');
    }

    await pool.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND job_id = $2',
      [userId, jobId]
    );

    try { await redis.del(`bookmarks:user:${userId}`); } catch (e) { /* ignore */ }

    return sendSuccess(res, 200, undefined, 'Bookmark deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { createBookmark, getAllUserBookmarks, getBookmarkById, deleteBookmark };