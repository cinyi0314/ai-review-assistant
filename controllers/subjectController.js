const {
  getAllSubjects,
  getOrCreateSubject,
  deleteSubject,
  updateLastAccessed,
  getLastSubject,
  getSubjectById,
  addFileToSubject,
  getSubjectFiles,
  removeFileFromSubject,
  updateSubject,
} = require('../services/subjectService');

// POST /api/subjects
function handleCreateSubject(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '缺少 name 参数' });
  const subject = getOrCreateSubject(name);
  res.status(201).json({ message: '科目已创建', subject });
}

// GET /api/subjects
function handleGetSubjects(_req, res) {
  res.json({ subjects: getAllSubjects() });
}

// GET /api/subjects/last
function handleGetLastSubject(_req, res) {
  const subject = getLastSubject();
  if (!subject) return res.json({ subject: null });
  res.json({ subject });
}

// GET /api/subjects/:id
function handleGetSubjectById(req, res) {
  const { id } = req.params;
  const subject = getSubjectById(id);
  if (!subject) return res.status(404).json({ error: '科目不存在' });
  res.json({ subject });
}

// PUT /api/subjects/:id
function handleUpdateSubject(req, res) {
  const { id } = req.params;
  const { name, examStyle } = req.body;
  const updated = updateSubject(id, { name, examStyle });
  if (!updated) return res.status(404).json({ error: '科目不存在' });
  res.json({ message: '已更新', subject: updated });
}

// DELETE /api/subjects/:id
function handleDeleteSubject(req, res) {
  const { id } = req.params;
  if (!deleteSubject(id)) return res.status(404).json({ error: '未找到该科目' });
  res.json({ message: '科目及关联数据已删除' });
}

// GET /api/subjects/:id/files
function handleGetSubjectFiles(req, res) {
  const { id } = req.params;
  const subject = getSubjectById(id);
  if (!subject) return res.status(404).json({ error: '科目不存在' });
  res.json({ subjectId: id, files: subject.files, examStyle: subject.examStyle });
}

// POST /api/subjects/:id/files
function handleAddFileToSubject(req, res) {
  const { id } = req.params;
  const { fileId, name, type, path: filePath, size, uploadedAt } = req.body;
  if (!fileId || !name) return res.status(400).json({ error: '缺少 fileId 或 name' });
  const subject = getSubjectById(id);
  if (!subject) return res.status(404).json({ error: '科目不存在' });
  const entry = addFileToSubject(id, { id: fileId, name, type: type || 'material', path: filePath, size, uploadedAt });
  res.status(201).json({ message: '文件已添加', file: entry });
}

// DELETE /api/subjects/:id/files/:fileId
function handleRemoveFile(req, res) {
  const { id, fileId } = req.params;
  if (!removeFileFromSubject(id, fileId)) return res.status(404).json({ error: '文件未找到' });
  res.json({ message: '文件已删除' });
}

// POST /api/subjects/update-access
function handleUpdateLastAccessed(req, res) {
  const { subjectId } = req.body;
  if (!subjectId) return res.status(400).json({ error: '缺少 subjectId' });
  const updated = updateLastAccessed(subjectId);
  if (!updated) return res.status(404).json({ error: '科目不存在' });
  res.json({ message: '已更新', subject: updated });
}

module.exports = {
  handleCreateSubject,
  handleGetSubjects,
  handleGetLastSubject,
  handleGetSubjectById,
  handleUpdateSubject,
  handleDeleteSubject,
  handleGetSubjectFiles,
  handleAddFileToSubject,
  handleRemoveFile,
  handleUpdateLastAccessed,
};
