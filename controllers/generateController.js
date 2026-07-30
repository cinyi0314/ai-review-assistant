const path = require('path');
const fs = require('fs');

const { extractText } = require('../utils/fileParser');
const { generateReviewContent } = require('../services/aiService');
const { saveKnowledgePoints } = require('../services/knowledgeService');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const RESULTS_FILE = path.join(__dirname, '..', 'data', 'generateResults.json');
const STYLES_FILE = path.join(__dirname, '..', 'data', 'examStyles.json');

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

function readStyles() {
  if (!fs.existsSync(STYLES_FILE)) return [];
  return JSON.parse(fs.readFileSync(STYLES_FILE, 'utf-8'));
}

// --------------- handler ---------------
async function handleGenerate(req, res) {
  const { fileId, questionTypes = [], examFileId, regenerate = false, questionCount = 3, subjectId = null, scope = 'all', selectedFileIds = [], selectedPoints = [], useAnswerSource = false, confirmedKnowledge = [] } = req.body;
  if (regenerate) console.log(`[regenerate] Force fresh generation for fileId=${fileId}`);

  const knowledgePoints = confirmedKnowledge.length > 0 ? confirmedKnowledge : selectedPoints;

  // 优先使用用户确认的知识点直接出题
  if (knowledgePoints.length > 0) {
    const pointText = knowledgePoints.map((p, i) => `${i + 1}. ${p}`).join('\n');
    let prompt = `请仅针对以下知识点出 ${questionCount} 道题目：\n\n${pointText}`;

    let examStyle = null;
    if (examFileId) {
      const { getSubjectExamStyle } = require('../services/subjectService');
      examStyle = getSubjectExamStyle(subjectId) || getSubjectExamStyle(examFileId);
      if (!examStyle) { const styles = readStyles(); const sr = styles.find((s) => s.fileId === examFileId); if (sr) examStyle = sr.style; }
    }

    const result = await generateReviewContent(prompt, { questionTypes, examStyle, questionCount });
    if (result.knowledgePoints?.length > 0) saveKnowledgePoints('knowledge-based', result.knowledgePoints, subjectId);
    const record = { fileId: 'knowledge-based', generatedAt: new Date().toISOString(), result };
    const results = readResults(); results.push(record); writeResults(results);
    return res.json({ ...result, fileId: 'knowledge-based', subjectId });
  }

  // 回退：从文件提取文本
  let sourceFileIds = [];
  if (scope === 'specific' && Array.isArray(selectedFileIds) && selectedFileIds.length > 0) {
    sourceFileIds = selectedFileIds;
  } else if (fileId) {
    sourceFileIds = [fileId];
  } else if (!fileId) {
    return res.status(400).json({ error: '缺少 fileId 参数' });
  }

  // 提取文本
  const { getSubjectById } = require('../services/subjectService');
  const docs = readDocuments();
  const texts = [];

  for (const fid of sourceFileIds) {
    let doc = docs.find((d) => d.id === fid);
    if (!doc && subjectId) {
      const subject = getSubjectById(subjectId);
      const fileEntry = subject?.files?.find((f) => f.id === fid);
      if (fileEntry) doc = { id: fileEntry.id, path: fileEntry.path, originalName: fileEntry.name };
    }
    if (!doc) continue;
    try {
      const t = doc.userEditedText || (await extractText(doc.path));
      texts.push(t);
    } catch (err) {
      console.error(`Failed to extract text for ${fid}:`, err.message);
    }
  }

  if (texts.length === 0) {
    return res.status(500).json({ error: '无法提取任何文件的文本' });
  }

  const text = texts.join('\n\n---\n\n');

  // 如果指定了知识点范围，追加指令
  let finalText = text;
  if (scope === 'specific' && selectedPoints.length > 0) {
    finalText = `请仅针对以下知识点出题：\n${selectedPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n原始资料：\n${text}`;
  }

  // 如果启用答案来源，拼接电子书内容
  if (useAnswerSource && subjectId) {
    const { getCombinedAnswerText } = require('../services/answerSourceService');
    const answerText = getCombinedAnswerText(subjectId);
    if (answerText) {
      finalText = `【考试范围/题目】\n${text}\n\n【参考答案来源（电子书）】\n${answerText}\n\n请优先从答案来源中查找正确答案。`;
    }
  }

  // 加载出题风格（优先从 subject.examStyle，其次 examStyles.json）
  let examStyle = null;
  if (examFileId) {
    // 尝试从科目读取
    const { getSubjectExamStyle } = require('../services/subjectService');
    examStyle = getSubjectExamStyle(subjectId) || getSubjectExamStyle(examFileId);
    // 回退 examStyles.json
    if (!examStyle) {
      const styles = readStyles();
      const styleRecord = styles.find((s) => s.fileId === examFileId);
      if (styleRecord) examStyle = styleRecord.style;
    }
  }

  // 调用 AI 生成复习内容
  const result = await generateReviewContent(finalText, { questionTypes, examStyle, questionCount });

  // 自动保存知识点到 knowledge.json
  if (result.knowledgePoints && result.knowledgePoints.length > 0) {
    saveKnowledgePoints(sourceFileIds[0], result.knowledgePoints, subjectId);
    // 同时回写到 documents.json 的 extractedPoints
    if (docs.length > 0) {
      const srcDoc = docs.find((d) => d.id === sourceFileIds[0]);
      if (srcDoc) {
        srcDoc.extractedPoints = result.knowledgePoints;
        fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
      }
    }
  }

  // 持久化生成结果
  const record = {
    fileId: sourceFileIds[0],
    generatedAt: new Date().toISOString(),
    result,
  };
  const results = readResults();
  results.push(record);
  writeResults(results);

  res.json({ ...result, fileId: sourceFileIds[0], subjectId });
}

// --------------- batch handler ---------------
async function handleBatchGenerate(req, res) {
  const { fileIds, questionTypes = [], examFileId, questionCount = 3, subjectId = null, scope = 'all', selectedFileIds = [], useAnswerSource = false } = req.body;

  const allFileIds = scope === 'specific' && Array.isArray(selectedFileIds) && selectedFileIds.length > 0
    ? selectedFileIds
    : fileIds;

  if (!allFileIds || !Array.isArray(allFileIds) || allFileIds.length === 0) {
    return res.status(400).json({ error: '缺少 fileIds 参数（需为数组）' });
  }

  const docs = readDocuments();
  const texts = [];
  for (const fid of allFileIds) {
    let doc = docs.find((d) => d.id === fid);
    if (!doc && subjectId) {
      const subject = getSubjectById(subjectId);
      const fe = subject?.files?.find((f) => f.id === fid);
      if (fe) doc = { id: fe.id, path: fe.path, originalName: fe.name };
    }
    if (!doc) return res.status(404).json({ error: `未找到文件记录：${fid}` });
    try {
      const t = doc.userEditedText || (await extractText(doc.path));
      texts.push(t);
    } catch (err) {
      console.error(`Failed to extract text for ${fid}:`, err.message);
      return res.status(500).json({ error: `文件读取失败：${fid}` });
    }
  }

  let combinedText = texts.join('\n\n---\n\n');

  if (useAnswerSource && subjectId) {
    const { getCombinedAnswerText } = require('../services/answerSourceService');
    const answerText = getCombinedAnswerText(subjectId);
    if (answerText) combinedText = `【考试范围/题目】\n${combinedText}\n\n【参考答案来源（电子书）】\n${answerText}\n\n请优先从答案来源中查找正确答案。`;
  }

  let examStyle = null;
  if (examFileId) {
    const { getSubjectExamStyle } = require('../services/subjectService');
    examStyle = getSubjectExamStyle(subjectId) || getSubjectExamStyle(examFileId);
    if (!examStyle) {
      const styles = readStyles();
      const sr = styles.find((s) => s.fileId === examFileId);
      if (sr) examStyle = sr.style;
    }
  }

  const result = await generateReviewContent(combinedText, { questionTypes, examStyle, questionCount });

  if (result.knowledgePoints && result.knowledgePoints.length > 0) {
    saveKnowledgePoints(fileIds[0], result.knowledgePoints, subjectId);
  }

  const record = {
    fileId: fileIds[0],
    generatedAt: new Date().toISOString(),
    result,
  };
  const results = readResults();
  results.push(record);
  writeResults(results);

  res.json({ ...result, fileId: fileIds ? fileIds[0] : fileId, subjectId });
}

module.exports = { handleGenerate, handleBatchGenerate };
