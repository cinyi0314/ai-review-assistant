const express = require('express');
const router = express.Router();
const {
  handleAddWrongQuestion,
  handleGetWrongQuestions,
  handleDeleteWrongQuestion,
  handleGetWrongQuestionsBySubject,
} = require('../controllers/wrongQuestionController');

router.post('/', handleAddWrongQuestion);
router.get('/subject/:subjectId', handleGetWrongQuestionsBySubject);
router.get('/:fileId', handleGetWrongQuestions);
router.delete('/:id', handleDeleteWrongQuestion);

module.exports = router;
