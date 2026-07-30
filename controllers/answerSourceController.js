const { extractText } = require('../utils/fileParser');
const fs = require('fs');
const path = require('path');
const {
  addAnswerSource,
  getAnswerSources,
  deleteAnswerSource,
} = require('../services/answerSourceService');
const { addFileToSubject } = require('../services/subjectService');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');

// POST /api/answer-sources — 上传电子书并提取文本
async function handleUploadAnswerSource(req, res) {
  if (!req.file) return res.status(400).json({ error: '请选择电子书文件' });

  const { subjectId } = req.body;
  try {
    const extractedText = await extractText(req.file.path);

    // 写入 documents.json
    const docId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    const docs = fs.existsSync(DOCUMENTS_FILE)
      ? JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'))
      : [];
    docs.push({
      id: docId,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      fileType: 'answer_source',
    });
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');

    // 存入 answerSources.json
    const record = addAnswerSource({
      subjectId: subjectId || null,
      fileId: docId,
      fileName: req.file.originalname,
      extractedText,
    });

    // 写入科目
    if (subjectId) {
      addFileToSubject(subjectId, {
        id: docId,
        name: req.file.originalname,
        type: 'answer_source',
        path: req.file.path,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    res.json({
      message: '电子书已上传并提取文本',
      id: record.id,
      fileId: docId,
      textLength: extractedText.length,
    });
  } catch (err) {
    res.status(500).json({ error: `提取失败：${err.message}` });
  }
}

// GET /api/answer-sources/:subjectId
function handleGetAnswerSources(req, res) {
  const { subjectId } = req.params;
  res.json({ answerSources: getAnswerSources(subjectId) });
}

// DELETE /api/answer-sources/:id
function handleDeleteAnswerSource(req, res) {
  const { id } = req.params;
  if (!deleteAnswerSource(id)) return res.status(404).json({ error: '未找到该记录' });
  res.json({ message: '已删除' });
}

module.exports = { handleUploadAnswerSource, handleGetAnswerSources, handleDeleteAnswerSource };
