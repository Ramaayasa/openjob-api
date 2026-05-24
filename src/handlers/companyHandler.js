const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createCompanySchema, updateCompanySchema } = require('../validators/companyValidator');
const { client: redis } = require('../utils/redis');

const CACHE_TTL = 3600;

const createCompany = async (req, res) => {
  const { error, value } = createCompanySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendFailed(res, 400, error.details.map((d) => d.message).join(', '));
  }

  const { name, location, description, website, logo_url } = value;
  const id = uuidv4();

  try {
    await pool.query(
      'INSERT INTO companies (id, name, location, description, website, logo_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, location, description || null, website || null, logo_url || null]
    );
    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, location, description, website, logo_url FROM companies ORDER BY created_at DESC'
    );
    return sendSuccess(res, 200, { companies: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getCompanyById = async (req, res) => {
  const { id } = req.params;
  const cacheKey = `company:${id}`;

  try {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Data-Source', 'cache');
        return res.status(200).json({ status: 'success', data: JSON.parse(cached) });
      }
    } catch (e) { /* redis tidak tersedia, lanjut ke db */ }

    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Company not found');
    }

    const company = result.rows[0];

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(company));
    } catch (e) { /* ignore */ }

    res.setHeader('X-Data-Source', 'database');
    return res.status(200).json({ status: 'success', data: company });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateCompany = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateCompanySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return sendFailed(res, 400, error.details.map((d) => d.message).join(', '));
  }
  const cacheKey = `company:${id}`;
  try {
    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Company not found');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (value.name !== undefined) { fields.push(`name = $${idx++}`); values.push(value.name); }
    if (value.location !== undefined) { fields.push(`location = $${idx++}`); values.push(value.location); }
    if (value.description !== undefined) { fields.push(`description = $${idx++}`); values.push(value.description); }
    if (value.website !== undefined) { fields.push(`website = $${idx++}`); values.push(value.website); }
    if (value.logo_url !== undefined) { fields.push(`logo_url = $${idx++}`); values.push(value.logo_url); }

    if (fields.length === 0) return sendFailed(res, 400, 'No fields to update');

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(`UPDATE companies SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    // Invalidate cache
    try { await redis.del(cacheKey); } catch (e) { /* ignore */ }

    // Return updated data (dibutuhkan test Postman V2)
    const updated = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    return sendSuccess(res, 200, updated.rows[0], 'Company updated successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteCompany = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Company not found');
    }

    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    // Invalidate cache
    try { await redis.del(`company:${id}`); } catch (e) { /* ignore */ }

    return sendSuccess(res, 200, undefined, 'Company deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany };
