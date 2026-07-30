const svc = require('../services/customQuestionTypeService');

function handleGetAll(_req, res) { res.json({ types: svc.getAll() }); }

function handleCreate(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '缺少 name' });
  res.status(201).json({ type: svc.create(req.body) });
}

function handleUpdate(req, res) {
  const { id } = req.params;
  const updated = svc.update(id, req.body);
  if (!updated) return res.status(404).json({ error: '未找到' });
  res.json({ type: updated });
}

function handleDelete(req, res) {
  const { id } = req.params;
  if (!svc.remove(id)) return res.status(404).json({ error: '未找到' });
  res.json({ message: '已删除' });
}

module.exports = { handleGetAll, handleCreate, handleUpdate, handleDelete };
