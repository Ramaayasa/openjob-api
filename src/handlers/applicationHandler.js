const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createApplicationSchema, updateApplicationSchema } = require('../validators/authValidator');

const applyForJob = async (req, res) => {
  const { error, value } = createApplicationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
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

    const id = uuidv4();
    await pool.query(
      'INSERT INTO applications (id, user_id, job_id, status, cover_letter) VALUES ($1, $2, $3, $4, $5)',
      [id, user_id, job_id, status || 'pending', cover_letter || null]
    );

    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email,
              j.title AS job_title
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
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
  try {
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

    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getApplicationsByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, j.title AS job_title
       FROM applications a
       LEFT JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [userId]
    );
    return sendSuccess(res, 200, { applications: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getApplicationsByJobId = async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.job_id = $1 ORDER BY a.created_at DESC`,
      [jobId]
    );
    return sendSuccess(res, 200, { applications: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateApplicationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  try {
    const existing = await pool.query('SELECT id FROM applications WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Application not found');
    }

    await pool.query(
      'UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2',
      [value.status, id]
    );

    return sendSuccess(res, 200, undefined, 'Application status updated');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteApplication = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT id FROM applications WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Application not found');
    }

    await pool.query('DELETE FROM applications WHERE id = $1', [id]);
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