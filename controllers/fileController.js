const path = require('path');
const fs = require('fs');
const { extractText } = require('../utils/fileParser');
const { extractKnowledgeOnly } = require('../services/aiService');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const SUBJECTS_FILE = path.join(__dirname, '..', 'data', 'subjects.json');

// --------------- helpers ---------------
function readDocs() {
  if (!fs.existsSync(DOCUMENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
}
function writeDocs(docs) {
  fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
}

// --------------- handlers ---------------

// POST /api/files/:fileId/extract — 提取文本供用户预览确认
async function handleExtractText(req, res) {
  const { fileId } = req.params;
  const docs = readDocs();
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) return res.status(404).json({ error: '未找到该文件' });

  try {
    const text = await extractText(doc.path);
    // 缓存提取结果
    doc.extractedText = text;
    writeDocs(docs);
    res.json({ fileId, extractedText: text, fileName: doc.originalName });
  } catch (err) {
    res.status(500).json({ error: `文本提取失败：${err.message}` });
  }
}

// PUT /api/files/:fileId/content — 保存用户编辑后的内容
function handleSaveContent(req, res) {
  const { fileId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '缺少 content 参数' });

  const docs = readDocs();
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) return res.status(404).json({ error: '未找到该文件' });

  doc.userEditedText = content;
  writeDocs(docs);
  res.json({ message: '内容已保存', fileId });
}

// DELETE /api/files/:fileId
function handleDeleteFile(req, res) {
  const { fileId } = req.params;
  if (!fileId) {
    return res.status(400).json({ error: '缺少 fileId 参数' });
  }

  const cleanup = [];
  let filePath = null;      // 磁盘文件路径（用于物理删除）
  let foundAnywhere = false;

  // 1) 从 subjects.json 中查找并移除（主要数据源）
  if (fs.existsSync(SUBJECTS_FILE)) {
    const subjects = JSON.parse(fs.readFileSync(SUBJECTS_FILE, 'utf-8'));
    subjects.forEach((s) => {
      if (s.files) {
        const entry = s.files.find((f) => f.id === fileId);
        if (entry) {
          filePath = entry.path;                  // 记录磁盘路径
          foundAnywhere = true;
        }
        const before = s.files.length;
        s.files = s.files.filter((f) => f.id !== fileId);
        if (s.files.length < before) {
          cleanup.push(`科目"${s.name}"`);
        }
      }
    });
    // 写回 subjects.json
    fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(subjects, null, 2), 'utf-8');
  }

  // 2) 从 documents.json 中查找并删除（兼容旧数据）
  if (fs.existsSync(DOCUMENTS_FILE)) {
    const docs = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
    const idx = docs.findIndex((d) => d.id === fileId);
    if (idx !== -1) {
      const removed = docs.splice(idx, 1)[0];
      if (!filePath) filePath = removed.path;
      foundAnywhere = true;
      fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
    }
  }

  // 3) 清理 knowledge.json
  const knFile = path.join(__dirname, '..', 'data', 'knowledge.json');
  if (fs.existsSync(knFile)) {
    const kn = JSON.parse(fs.readFileSync(knFile, 'utf-8'));
    const before = kn.length;
    const filtered = kn.filter((k) => k.fileId !== fileId);
    if (filtered.length < before) {
      fs.writeFileSync(knFile, JSON.stringify(filtered, null, 2), 'utf-8');
      cleanup.push(`知识点(${before - filtered.length})`);
    }
  }

  // 4) 清理 wrongQuestions.json
  const wqFile = path.join(__dirname, '..', 'data', 'wrongQuestions.json');
  if (fs.existsSync(wqFile)) {
    const wq = JSON.parse(fs.readFileSync(wqFile, 'utf-8'));
    const before = wq.length;
    const filtered = wq.filter((w) => w.fileId !== fileId);
    if (filtered.length < before) {
      fs.writeFileSync(wqFile, JSON.stringify(filtered, null, 2), 'utf-8');
      cleanup.push(`错题(${before - filtered})`);
    }
  }

  // 5) 清理 answerSources.json
  const asFile = path.join(__dirname, '..', 'data', 'answerSources.json');
  if (fs.existsSync(asFile)) {
    const asList = JSON.parse(fs.readFileSync(asFile, 'utf-8'));
    const before = asList.length;
    const filtered = asList.filter((a) => a.fileId !== fileId);
    if (filtered.length < before) {
      fs.writeFileSync(asFile, JSON.stringify(filtered, null, 2), 'utf-8');
      cleanup.push('答案来源');
    }
  }

  if (!foundAnywhere) {
    return res.status(404).json({ error: '文件不存在于 subjects 或 documents 中' });
  }

  console.log(`[fileController] Deleted fileId=${fileId}, cleaned: ${cleanup.join(', ') || '无关联'}`);

  // 6) 删除磁盘文件
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      cleanup.push('磁盘文件');
    } catch (err) {
      console.error('Failed to unlink:', err.message);
    }
  }

  res.json({ message: '文件已删除', fileId, cleanedUp: cleanup });
}

// POST /api/files/:fileId/extract-knowledge — 仅提取知识点（不生成题目）
async function handleExtractKnowledge(req, res) {
  const { fileId } = req.params;
  const docs = readDocs();
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) return res.status(404).json({ error: '未找到该文件' });

  try {
    const text = doc.userEditedText || (await extractText(doc.path));
    const knowledgePoints = await extractKnowledgeOnly(text);

    // 保存到 documents.json
    doc.extractedPoints = knowledgePoints;
    writeDocs(docs);

    if (knowledgePoints.length === 0) {
      return res.json({ fileId, knowledgePoints: [], hint: '提取到 0 个知识点，请手动输入' });
    }

    res.json({ fileId, knowledgePoints });
  } catch (err) {
    res.status(500).json({ error: `知识点提取失败：${err.message}` });
  }
}

module.exports = { handleDeleteFile, handleExtractText, handleSaveContent, handleExtractKnowledge };
