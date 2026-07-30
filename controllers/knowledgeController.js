const {
  saveKnowledgePoints,
  getKnowledgePoints,
  toggleMastered,
  getKnowledgePointsBySubject,
} = require('../services/knowledgeService');

// --------------- POST /api/knowledge ---------------
function handleSaveKnowledgePoints(req, res) {
  const { fileId, knowledgePoints } = req.body;
  if (!fileId || !Array.isArray(knowledgePoints)) {
    return res.status(400).json({ error: '缺少 fileId 或 knowledgePoints 参数' });
  }
  const records = saveKnowledgePoints(fileId, knowledgePoints);
  res.status(201).json({ message: '知识点已保存', knowledgePoints: records });
}

// --------------- GET /api/knowledge/:fileId ---------------
function handleGetKnowledgePoints(req, res) {
  const { fileId } = req.params;
  if (!fileId) return res.status(400).json({ error: '缺少 fileId 参数' });
  const list = getKnowledgePoints(fileId);
  const subjectId = list.length > 0 ? list[0].subjectId : null;
  res.json({ fileId, subjectId, knowledgePoints: list });
}

// --------------- GET /api/knowledge/subject/:subjectId ---------------
function handleGetKnowledgeBySubject(req, res) {
  const { subjectId } = req.params;
  if (!subjectId) return res.status(400).json({ error: '缺少 subjectId 参数' });
  const list = getKnowledgePointsBySubject(subjectId);
  res.json({ subjectId, knowledgePoints: list });
}

// --------------- PUT /api/knowledge/:id/toggle ---------------
function handleToggleMastered(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: '缺少 id 参数' });
  const updated = toggleMastered(id);
  if (!updated) return res.status(404).json({ error: '未找到该知识点' });
  res.json({ message: '状态已更新', knowledgePoint: updated });
}

module.exports = {
  handleSaveKnowledgePoints,
  handleGetKnowledgePoints,
  handleToggleMastered,
  handleGetKnowledgeBySubject,
};
