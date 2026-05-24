const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createCompanySchema, updateCompanySchema } = require('../validators/companyValidator');

const createCompany = async (req, res) => {
  const { error, value } = createCompanySchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
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
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    return sendSuccess(res, 200, { companies: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Company not found');
    }
    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateCompany = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateCompanySchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

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

    if (fields.length === 0) {
      return sendFailed(res, 400, 'No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE companies SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return sendSuccess(res, 200, undefined, 'Company updated successfully');
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
    return sendSuccess(res, 200, undefined, 'Company deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany };
