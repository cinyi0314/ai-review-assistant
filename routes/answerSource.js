const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/answerSourceController');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 电子书可达 20MB
});

router.post('/', upload.single('file'), ctrl.handleUploadAnswerSource);
router.get('/:subjectId', ctrl.handleGetAnswerSources);
router.delete('/:id', ctrl.handleDeleteAnswerSource);

module.exports = router;
