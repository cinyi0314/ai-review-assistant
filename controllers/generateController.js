const path = require('path');
const fs = require('fs');

const { extractText } = require('../utils/fileParser');
const { generateReviewContent } = require('../services/aiService');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const RESULTS_FILE = path.join(__dirname, '..', 'data', 'generateResults.json');

// --------------- helpers ---------------
function readDocuments() {
  if (!fs.existsSync(DOCUMENTS_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
}

function readResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
}

function writeResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8');
}

// --------------- handler ---------------
async function handleGenerate(req, res) {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: '缺少 fileId 参数' });
  }

  // 查找文件记录
  const docs = readDocuments();
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) {
    return res.status(404).json({ error: '未找到该文件记录' });
  }

  // 提取文本
  let text;
  try {
    text = await extractText(doc.path);
  } catch (err) {
    console.error('Failed to extract text:', err.message);
    return res.status(500).json({ error: '文件读取失败' });
  }

  // 调用 AI 生成复习内容
  const result = await generateReviewContent(text);

  // 持久化生成结果
  const record = {
    fileId,
    generatedAt: new Date().toISOString(),
    result,
  };
  const results = readResults();
  results.push(record);
  writeResults(results);

  res.json(result);
}

module.exports = { handleGenerate };
