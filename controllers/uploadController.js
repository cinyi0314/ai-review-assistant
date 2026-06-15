const path = require('path');
const fs = require('fs');

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

  const doc = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
  };

  const docs = readDocuments();
  docs.push(doc);
  writeDocuments(docs);

  res.json({ message: '文件上传成功', id: doc.id });
}

module.exports = { handleUpload };
