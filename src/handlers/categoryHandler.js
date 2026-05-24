const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');

const createCategory = async (req, res) => {
  const { error, value } = createCategorySchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  const { name } = value;
  const id = uuidv4();

  try {
    await pool.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [id, name]);
    return sendSuccess(res, 201, { id });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY created_at DESC');
    return sendSuccess(res, 200, { categories: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Category not found');
    }
    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const updateCategory = async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateCategorySchema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return sendFailed(res, 400, message);
  }

  try {
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Category not found');
    }

    await pool.query(
      'UPDATE categories SET name = $1, updated_at = NOW() WHERE id = $2',
      [value.name, id]
    );

    return sendSuccess(res, 200, undefined, 'Category updated successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendFailed(res, 404, 'Category not found');
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return sendSuccess(res, 200, undefined, 'Category deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory };
