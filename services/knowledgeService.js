const path = require('path');
const fs = require('fs');

const KNOWLEDGE_FILE = path.join(__dirname, '..', 'data', 'knowledge.json');

// --------------- helpers ---------------
function readAll() {
  if (!fs.existsSync(KNOWLEDGE_FILE)) {
    fs.writeFileSync(KNOWLEDGE_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
}

function writeAll(list) {
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// --------------- public API ---------------

/**
 * 批量保存知识点（生成复习内容时调用）
 * @param {string} fileId - 关联文件 ID
 * @param {string[]} knowledgePoints - 知识点文本数组
 * @returns {object[]} 保存后的记录列表
 */
function saveKnowledgePoints(fileId, knowledgePoints, subjectId = null) {
  const list = readAll();

  // 先移除该 fileId 的旧记录，再写入新记录（覆盖逻辑）
  const filtered = list.filter((item) => item.fileId !== fileId);
  const newItems = knowledgePoints.map((content) => ({
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
    fileId,
    subjectId,
    content,
    mastered: false,
    createdAt: new Date().toISOString(),
  }));

  filtered.push(...newItems);
  writeAll(filtered);
  return newItems;
}

/**
 * 获取某文件的所有知识点
 * @param {string} fileId
 * @returns {object[]}
 */
function getKnowledgePoints(fileId) {
  return readAll().filter((item) => item.fileId === fileId);
}

/** 获取某科目的所有知识点 */
function getKnowledgePointsBySubject(subjectId) {
  return readAll().filter((item) => item.subjectId === subjectId);
}

/**
 * 切换知识点的掌握状态
 * @param {string} id
 * @returns {object|null} 更新后的记录，未找到返回 null
 */
function toggleMastered(id) {
  const list = readAll();
  const item = list.find((i) => i.id === id);
  if (!item) return null;

  item.mastered = !item.mastered;
  writeAll(list);
  return item;
}

module.exports = { saveKnowledgePoints, getKnowledgePoints, toggleMastered };
