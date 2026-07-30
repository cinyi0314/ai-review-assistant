const express = require('express');
const router = express.Router();
const {
  handleSaveKnowledgePoints,
  handleGetKnowledgePoints,
  handleToggleMastered,
  handleGetKnowledgeBySubject,
} = require('../controllers/knowledgeController');
const { handleSaveSubjectPoints } = require('../controllers/knowledgePointsController');

router.post('/', handleSaveKnowledgePoints);
router.get('/subject/:subjectId', handleGetKnowledgeBySubject);
router.put('/subject/:subjectId', handleSaveSubjectPoints);       // 更新科目知识点
router.get('/:fileId', handleGetKnowledgePoints);
router.put('/:id/toggle', handleToggleMastered);

module.exports = router;
