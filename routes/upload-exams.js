const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { handleUploadExams } = require('../controllers/examUploadController');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function uploadExams(req, res, next) {
  upload.array('files', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '文件过大，最大支持 10MB' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(500).json({ error: err.message });
    next();
  });
}

router.post('/', uploadExams, handleUploadExams);

module.exports = router;
