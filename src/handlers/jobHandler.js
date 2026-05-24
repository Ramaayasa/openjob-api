const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createJobSchema, updateJobSchema } = require('../validators/jobValidator');

const createJob = async (req, res) => {
  const { error, value } = createJobSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const {
    company_id, category_id, title, description,
    job_type, experience_level, location_type, location_city,
    salary_min, salary_max, is_salary_visible, status,
  } = value;

  try {
    const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [company_id]);
    if (companyCheck.rows.length === 0) {
      return sendFailed(res, 404, 'Company not found');
    }

    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return sendFailed(res, 404, 'Category not found');
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO jobs (id, company_id, category_id, title, description, job_type, experience_level,
        location_type, location_city, salary_min, salary_max, is_salary_visible, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id, company_id, category_id, title, description || null,
        job_type || null, experience_level || null, location_type || null,
        location_city || null, salary_min || null, salary_max || null,
        is_salary_visible !== undefined ? is_salary_visible : true,
        status || 'open',
      ]
    );

    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllJobs = async (req, res) => {
  try {
    const { title, 'company-name': companyName } = req.query;
    const hasFilter = (title && title.trim() !== '') || (companyName && companyName.trim() !== '');

    const selectFields = hasFilter
      ? `j.id, j.company_id, j.category_id, j.title, j.description,
         j.job_type, j.experience_level, j.location_type, j.location_city,
         j.salary_min, j.salary_max, j.is_salary_visible, j.status,
         c.name AS company_name`
      : `j.id, j.company_id, j.category_id, j.title, j.description,
         j.job_type, j.experience_level, j.location_type, j.location_city,
         j.salary_min, j.salary_max, j.is_salary_visible, j.status`;

    let query = `
      SELECT ${selectFields}
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN categories cat ON j.category_id = cat.id
    `;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (title && title.trim() !== '') {
      conditions.push(`j.title ILIKE $${idx++}`);
      values.push(`%${title}%`);
    }

    if (companyName && companyName.trim() !== '') {
      conditions.push(`c.name ILIKE $${idx++}`);
      values.push(`%${companyName}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY j.created_at DESC';

    const result = await pool.query(query, values);
    return sendSuccess(res, 200, { jobs: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getJobById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS company_name, cat.name AS category_name
       FROM jobs j
       LEFT JOIN companies c ON j.company_id = c.id
       LEFT JOIN categories cat ON j.category_id = cat.id
       WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Job not found');
    }

    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getJobsByCompanyId = async (req, res) => {
  const { companyId } = req.params;
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS company_name, cat.name AS category_name
       FROM jobs j
       LEFT JOIN companies c ON j.company_id = c.id
       LEFT JOIN categories cat ON j.category_id = cat.id
       WHERE j.company_id = $1 ORDER BY j.created_at DESC`,
      [companyId]
    );

    return sendSuccess(res, 200, { jobs: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getJobsByCategoryId = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS company_name, cat.name AS category_name
       FROM jobs j
       LEFT JOIN companies c ON j.company_id = c.id
       LEFT JOIN categories cat ON j.category_id = cat.id
       WHERE j.category_id = $1 ORDER BY j.created_at DESC`,
      [categoryId]
    );

    return sendSuccess(res, 200, { jobs: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateJob = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateJobSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  try {
    const existing = await pool.query('SELECT id FROM jobs WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Job not found');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      'company_id', 'category_id', 'title', 'description', 'job_type',
      'experience_level', 'location_type', 'location_city', 'salary_min',
      'salary_max', 'is_salary_visible', 'status',
    ];

    for (const key of allowed) {
      if (value[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value[key]);
      }
    }

    if (fields.length === 0) {
      return sendFailed(res, 400, 'No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE jobs SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return sendSuccess(res, 200, undefined, 'Job updated successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteJob = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT id FROM jobs WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Job not found');
    }

    await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
    return sendSuccess(res, 200, undefined, 'Job deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = {
  createJob, getAllJobs, getJobById,
  getJobsByCompanyId, getJobsByCategoryId,
  updateJob, deleteJob,
};