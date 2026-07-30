const path = require('path');
const fs = require('fs');

const ANSWER_SOURCES_FILE = path.join(__dirname, '..', 'data', 'answerSources.json');

function readAll() {
  if (!fs.existsSync(ANSWER_SOURCES_FILE)) {
    fs.writeFileSync(ANSWER_SOURCES_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(ANSWER_SOURCES_FILE, 'utf-8'));
}

function writeAll(list) {
  fs.writeFileSync(ANSWER_SOURCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/** 添加答案来源（上传电子书后调用） */
function addAnswerSource({ subjectId, fileId, fileName, extractedText }) {
  const list = readAll();
  const item = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
    subjectId,
    fileId,
    fileName,
    extractedText,
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  writeAll(list);
  return item;
}

/** 获取科目的所有答案来源 */
function getAnswerSources(subjectId) {
  return readAll().filter((a) => a.subjectId === subjectId);
}

/** 获取合并的答案来源文本（用于 AI prompt） */
function getCombinedAnswerText(subjectId) {
  const sources = getAnswerSources(subjectId);
  if (sources.length === 0) return '';
  return sources.map((s) => s.extractedText).join('\n\n---\n\n');
}

/** 删除答案来源 */
function deleteAnswerSource(id) {
  const list = readAll();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  writeAll(list);
  return true;
}

module.exports = { addAnswerSource, getAnswerSources, getCombinedAnswerText, deleteAnswerSource };
