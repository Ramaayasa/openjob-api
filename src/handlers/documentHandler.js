const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../utils/db');
const { sendSuccess, sendFailed } = require('../utils/response');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('File is required to be a PDF'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const uploadDocument = [
  (req, res, next) => {
    upload.single('document')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendFailed(res, 400, 'File size exceeds 5MB limit');
        }
        return sendFailed(res, 400, err.message);
      }
      if (err) {
        return sendFailed(res, 400, err.message || 'File is required');
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return sendFailed(res, 400, 'File is required and must be a PDF');
    }

    const userId = req.user.id;
    const id = uuidv4();
    const { originalname, filename, size, mimetype } = req.file;

    try {
      await pool.query(
        'INSERT INTO documents (id, user_id, original_name, file_name, file_size, mime_type) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, userId, originalname, filename, size, mimetype]
      );

      return sendSuccess(res, 201, {
        documentId: id,
        filename: filename,
        originalName: originalname,
        size: size,
      });
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

    const doc = result.rows[0];
    const filePath = path.join(uploadDir, doc.file_name);

    if (!fs.existsSync(filePath)) {
      return sendFailed(res, 404, 'File not found on server');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    return res.sendFile(filePath);
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

    const filePath = path.join(uploadDir, doc.file_name);
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
