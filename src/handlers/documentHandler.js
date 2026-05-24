const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const uploadDocument = [
  upload.single('document'),
  async (req, res) => {
    if (!req.file) {
      return sendFailed(res, 400, 'No file uploaded');
    }

    const userId = req.user.id;
    const id = uuidv4();
    const { originalname, filename, size, mimetype } = req.file;

    try {
      await pool.query(
        'INSERT INTO documents (id, user_id, original_name, file_name, file_size, mime_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, userId, originalname, filename, size, mimetype]
      );

      return sendSuccess(res, 201, { id, file_name: filename, original_name: originalname });
    } catch (err) {
      console.error(err);
      return sendFailed(res, 500, 'Internal server error');
    }
  },
];

const getAllDocuments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    return sendSuccess(res, 200, { documents: result.rows });
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const getDocumentById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Document not found');
    }
    return sendSuccess(res, 200, result.rows[0]);
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendFailed(res, 404, 'Document not found');
    }

    const doc = result.rows[0];
    if (doc.user_id !== userId) {
      return sendFailed(res, 403, 'Forbidden: you do not own this document');
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '../../uploads', doc.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    return sendSuccess(res, 200, undefined, 'Document deleted successfully');
  } catch (err) {
    console.error(err);
    return sendFailed(res, 500, 'Internal server error');
  }
};

module.exports = { uploadDocument, getAllDocuments, getDocumentById, deleteDocument };
