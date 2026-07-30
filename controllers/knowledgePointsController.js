const path = require('path');
const fs = require('fs');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const SUBJECTS_FILE = path.join(__dirname, '..', 'data', 'subjects.json');

// GET /api/knowledge-points/:subjectId — 汇总知识点列表
function handleGetSubjectPoints(req, res) {
  const { subjectId } = req.params;

  // 从科目中获取文件 ID 列表
  let fileIds = [];
  if (fs.existsSync(SUBJECTS_FILE)) {
    const subjects = JSON.parse(fs.readFileSync(SUBJECTS_FILE, 'utf-8'));
    const subj = subjects.find((s) => s.id === subjectId);
    if (subj && subj.files) {
      fileIds = subj.files.map((f) => f.id);
    }
  }

  // 从 documents.json 中提取知识点
  const points = [];
  if (fs.existsSync(DOCUMENTS_FILE)) {
    const docs = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
    docs.forEach((doc) => {
      if (fileIds.includes(doc.id) && doc.extractedPoints && Array.isArray(doc.extractedPoints)) {
        doc.extractedPoints.forEach((pt) => {
          points.push({ text: pt, fileId: doc.id, fileName: doc.originalName });
        });
      }
    });
  }

  res.json({ subjectId, points });
}

// PUT /api/knowledge-points/:subjectId — 保存用户编辑的知识点
function handleSaveSubjectPoints(req, res) {
  const { subjectId } = req.params;
  const { fileId, points } = req.body;
  if (!fileId || !Array.isArray(points)) {
    return res.status(400).json({ error: '缺少 fileId 或 points 参数' });
  }

  if (!fs.existsSync(DOCUMENTS_FILE)) {
    return res.status(404).json({ error: 'documents.json 不存在' });
  }
  const docs = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) return res.status(404).json({ error: '未找到该文件' });

  doc.extractedPoints = points;
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  res.json({ message: '已更新', fileId, extractedPoints: points });
}

module.exports = { handleGetSubjectPoints, handleSaveSubjectPoints };
