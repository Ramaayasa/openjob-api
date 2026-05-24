const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createApplicationSchema, updateApplicationSchema } = require('../validators/authValidator');
const { client: redis } = require('../utils/redis');
const { publishMessage } = require('../utils/rabbitmq');

const CACHE_TTL = 3600;

const invalidateCaches = async (userId, jobId, applicationId) => {
  const keys = [];
  if (userId) keys.push(`applications:user:${userId}`);
  if (jobId) keys.push(`applications:job:${jobId}`);
  if (applicationId) keys.push(`application:${applicationId}`);
  for (const key of keys) {
    try { await redis.del(key); } catch (e) { /* ignore */ }
  }
};

const applyForJob = async (req, res) => {
  const { error, value } = createApplicationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendFailed(res, 400, error.details.map((d) => d.message).join(', '));
  }

  const { user_id, job_id, status, cover_letter } = value;

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return sendFailed(res, 404, 'User not found');
    }

    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [job_id]);
    if (jobCheck.rows.length === 0) {
      return sendFailed(res, 404, 'Job not found');
    }

    const dupCheck = await pool.query(
      'SELECT id FROM applications WHERE user_id = $1 AND job_id = $2',
      [user_id, job_id]
    );
    if (dupCheck.rows.length > 0) {
      return sendFailed(res, 400, 'You have already applied for this job');
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO applications (id, user_id, job_id, status, cover_letter) VALUES ($1, $2, $3, $4, $5)',
      [id, user_id, job_id, status || 'pending', cover_letter || null]
    );

    await invalidateCaches(user_id, job_id, null);
    await publishMessage({ application_id: id });

    return sendSuccess(res, 201, {
      id,
      user_id,
      job_id,
      status: status || 'pending',
    });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.job_id, a.status, a.cover_letter, a.created_at, a.updated_at,
              u.name AS user_name, u.email AS user_email,
              j.title AS job_title, j.company_id,
              c.name AS company_name, c.location AS company_location
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       ORDER BY a.created_at DESC`
    );
    return sendSuccess(res, 200, { applications: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getApplicationById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `application:${id}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: JSON.parse(cached) });
      }
    } catch (e) { /* ignore */ }

    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, j.title AS job_title
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Application not found');
    }

    const application = result.rows[0];

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(application));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: application });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getApplicationsByUserId = async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `applications:user:${userId}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: { applications: JSON.parse(cached) } });
      }
    } catch (e) { /* ignore */ }

    const result = await pool.query(
      `SELECT a.*, j.title AS job_title
       FROM applications a
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [userId]
    );

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: { applications: result.rows } });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getApplicationsByJobId = async (req, res) => {
  const { jobId } = req.params;
  const cacheKey = `applications:job:${jobId}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: { applications: JSON.parse(cached) } });
      }
    } catch (e) { /* ignore */ }

    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.job_id = $1 ORDER BY a.created_at DESC`,
      [jobId]
    );

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: { applications: result.rows } });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateApplicationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendFailed(res, 400, error.details.map((d) => d.message).join(', '));
  }

  try {
    const existingResult = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendFailed(res, 404, 'Application not found');
    }

    const existing = existingResult.rows[0];

    await pool.query(
      'UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2',
      [value.status, id]
    );

    await invalidateCaches(existing.user_id, existing.job_id, id);

    const updated = await pool.query(
      `SELECT a.*, u.name AS user_name, j.title AS job_title
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );

    return sendSuccess(res, 200, updated.rows[0], 'Application status updated');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteApplication = async (req, res) => {
  const { id } = req.params;
  try {
    const existingResult = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendFailed(res, 404, 'Application not found');
    }

    const existing = existingResult.rows[0];
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);

    await invalidateCaches(existing.user_id, existing.job_id, id);

    return sendSuccess(res, 200, undefined, 'Application deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = {
  applyForJob, getAllApplications, getApplicationById,
  getApplicationsByUserId, getApplicationsByJobId,
  updateApplicationStatus, deleteApplication,
};