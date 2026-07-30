const express = require('express');
const router = express.Router();
const {
  handleDeleteFile,
  handleExtractText,
  handleSaveContent,
  handleExtractKnowledge,
} = require('../controllers/fileController');

router.post('/:fileId/extract', handleExtractText);
router.post('/:fileId/extract-knowledge', handleExtractKnowledge);
router.put('/:fileId/content', handleSaveContent);
router.delete('/:fileId', handleDeleteFile);

module.exports = router;
