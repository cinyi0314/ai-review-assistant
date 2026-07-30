const path = require('path');
const fs = require('fs');
const { addFileToSubject } = require('../services/subjectService');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');

// --------------- helpers ---------------
function readDocuments() {
  if (!fs.existsSync(DOCUMENTS_FILE)) {
    fs.writeFileSync(DOCUMENTS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
}

function writeDocuments(docs) {
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
}

// --------------- handler ---------------
function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }

  const { subjectId, fileType, hasAnswers, chapter } = req.body;

  const doc = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    fileType: fileType || 'material',          // 'exam_range' | 'answer_ref'
    hasAnswers: hasAnswers === 'true',          // from form: string → bool
    chapter: chapter || '',
    extractedText: null,                        // 将在确认后填充
    userEditedText: null,
  };

  // 写入 documents.json
  const docs = readDocuments();
  docs.push(doc);
  writeDocuments(docs);

  // 写入科目
  if (subjectId) {
    addFileToSubject(subjectId, {
      id: doc.id,
      name: doc.originalName,
      type: doc.fileType === 'exam_range' ? 'exam' : 'material',
      path: doc.path,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      fileType: doc.fileType,
      hasAnswers: doc.hasAnswers,
      chapter: doc.chapter,
    });
  }

  res.json({ message: '文件上传成功', id: doc.id });
}

// --------------- batch handler ---------------
function handleBatchUpload(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }

  const docs = readDocuments();
  const results = req.files.map((file) => {
    const doc = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    docs.push(doc);
    return doc;
  });
  writeDocuments(docs);

  // 批量写入科目
  const { subjectId } = req.body;
  if (subjectId) {
    results.forEach((d) => {
      addFileToSubject(subjectId, {
        id: d.id,
        name: d.originalName,
        type: 'material',
        path: d.path,
        size: d.size,
        uploadedAt: d.uploadedAt,
      });
    });
  }

  res.json({ message: `成功上传 ${results.length} 个文件`, ids: results.map((d) => d.id) });
}

module.exports = { handleUpload, handleBatchUpload };
