const {
  addWrongQuestion,
  getWrongQuestions,
  deleteWrongQuestion,
  getWrongQuestionsBySubject,
} = require('../services/wrongQuestionService');

// --------------- POST /api/wrong-questions ---------------
function handleAddWrongQuestion(req, res) {
  const { fileId, question, userAnswer, correctAnswer, explanation } = req.body;

  if (!fileId || !question) {
    return res.status(400).json({ error: '缺少 fileId 或 question 参数' });
  }

  const record = addWrongQuestion({
    fileId,
    question,
    userAnswer: userAnswer || '',
    correctAnswer: correctAnswer || '',
    explanation: explanation || '',
  });

  res.status(201).json({ message: '错题记录已保存', record });
}

// --------------- GET /api/wrong-questions/:fileId ---------------
function handleGetWrongQuestions(req, res) {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(400).json({ error: '缺少 fileId 参数' });
  }

  const list = getWrongQuestions(fileId);
  const subjectId = list.length > 0 ? list[0].subjectId : null;
  res.json({ fileId, subjectId, wrongQuestions: list });
}

// --------------- DELETE /api/wrong-questions/:id ---------------
function handleDeleteWrongQuestion(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: '缺少 id 参数' });
  }

  const deleted = deleteWrongQuestion(id);
  if (!deleted) {
    return res.status(404).json({ error: '未找到该错题记录' });
  }

  res.json({ message: '错题记录已删除' });
}

function handleGetWrongQuestionsBySubject(req, res) {
  const { subjectId } = req.params;
  if (!subjectId) return res.status(400).json({ error: '缺少 subjectId 参数' });
  const list = getWrongQuestionsBySubject(subjectId);
  res.json({ subjectId, wrongQuestions: list });
}

module.exports = {
  handleAddWrongQuestion,
  handleGetWrongQuestions,
  handleDeleteWrongQuestion,
  handleGetWrongQuestionsBySubject,
};
