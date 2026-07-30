const path = require('path');
const fs = require('fs');

const WRONG_QUESTIONS_FILE = path.join(
  __dirname,
  '..',
  'data',
  'wrongQuestions.json',
);

// 艾宾浩斯遗忘曲线复习间隔（天）
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15];

// --------------- helpers ---------------
function readAll() {
  if (!fs.existsSync(WRONG_QUESTIONS_FILE)) {
    fs.writeFileSync(WRONG_QUESTIONS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(WRONG_QUESTIONS_FILE, 'utf-8'));
}

function writeAll(list) {
  fs.writeFileSync(WRONG_QUESTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

/** 计算下次复习日期 */
function getNextReviewDate(reviewCount) {
  const days =
    reviewCount < EBBINGHAUS_INTERVALS.length
      ? EBBINGHAUS_INTERVALS[reviewCount]
      : EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

// --------------- public API ---------------

/**
 * 获取需要复习的错题列表
 * @param {string} fileId
 * @returns {object[]} 待复习错题
 */
function getDueReviews(fileId) {
  const list = readAll();
  const now = new Date();

  return list.filter((item) => {
    if (item.fileId !== fileId) return false;

    // reviewCount 达到最大间隔次数 → 不再复习
    if (item.reviewCount >= EBBINGHAUS_INTERVALS.length) return false;

    // 未设置下次复习日期 → 默认创建后 1 天
    const dueDate = item.nextReviewDate
      ? new Date(item.nextReviewDate)
      : new Date(item.timestamp);
    return dueDate <= now;
  });
}

/**
 * 记录一次复习，更新 reviewCount 和 nextReviewDate
 * @param {string} id - 错题记录 ID
 * @returns {object|null} 更新后的记录
 */
function recordReview(id) {
  const list = readAll();
  const item = list.find((i) => i.id === id);
  if (!item) return null;

  item.reviewCount = (item.reviewCount || 0) + 1;
  item.lastReviewedAt = new Date().toISOString();
  item.nextReviewDate = getNextReviewDate(item.reviewCount);
  writeAll(list);
  return item;
}

/** 获取某科目的所有待复习错题 */
function getDueReviewsBySubject(subjectId) {
  const list = readAll();
  const now = new Date();
  return list.filter((item) => {
    if (item.subjectId !== subjectId) return false;
    if (item.reviewCount >= EBBINGHAUS_INTERVALS.length) return false;
    const dueDate = item.nextReviewDate ? new Date(item.nextReviewDate) : new Date(item.timestamp);
    return dueDate <= now;
  });
}

module.exports = { getDueReviews, recordReview, EBBINGHAUS_INTERVALS, getDueReviewsBySubject };
