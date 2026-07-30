const path = require('path');
const fs = require('fs');

const WRONG_QUESTIONS_FILE = path.join(
  __dirname,
  '..',
  'data',
  'wrongQuestions.json',
);

// --------------- helpers ---------------
function readWrongQuestions() {
  if (!fs.existsSync(WRONG_QUESTIONS_FILE)) {
    fs.writeFileSync(WRONG_QUESTIONS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(WRONG_QUESTIONS_FILE, 'utf-8'));
}

function writeWrongQuestions(list) {
  fs.writeFileSync(
    WRONG_QUESTIONS_FILE,
    JSON.stringify(list, null, 2),
    'utf-8',
  );
}

// --------------- public API ---------------

/**
 * 新增一条错题记录
 * @param {object} record
 * @param {string} record.fileId      - 关联的文件 ID
 * @param {string} record.question    - 题目题干
 * @param {string} record.userAnswer  - 用户错误答案
 * @param {string} record.correctAnswer - 正确答案
 * @param {string} record.explanation - 解析
 * @returns {object} 保存后的完整记录（含 id 和 timestamp）
 */
function addWrongQuestion(record) {
  const list = readWrongQuestions();

  const item = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
    fileId: record.fileId,
    subjectId: record.subjectId || null,
    question: record.question,
    userAnswer: record.userAnswer,
    correctAnswer: record.correctAnswer,
    explanation: record.explanation,
    timestamp: record.timestamp || new Date().toISOString(),
    reviewCount: 0,
    nextReviewDate: null,   // memoryCurveService 首次查询时默认 timestamp + 1 天
    lastReviewedAt: null,
  };

  list.push(item);
  writeWrongQuestions(list);
  return item;
}

/**
 * 根据 fileId 获取所有错题记录
 * @param {string} fileId
 * @returns {object[]}
 */
function getWrongQuestions(fileId) {
  const list = readWrongQuestions();
  return list.filter((item) => item.fileId === fileId);
}

/**
 * 删除指定 id 的错题记录
 * @param {string} id
 * @returns {boolean} 是否成功删除
 */
function deleteWrongQuestion(id) {
  const list = readWrongQuestions();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return false;
  list.splice(index, 1);
  writeWrongQuestions(list);
  return true;
}

/** 获取某科目的所有错题 */
function getWrongQuestionsBySubject(subjectId) {
  return readWrongQuestions().filter((item) => item.subjectId === subjectId);
}

module.exports = { addWrongQuestion, getWrongQuestions, deleteWrongQuestion, getWrongQuestionsBySubject };
