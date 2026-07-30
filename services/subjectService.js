const path = require('path');
const fs = require('fs');

const SUBJECTS_FILE = path.join(__dirname, '..', 'data', 'subjects.json');

// --------------- helpers ---------------
function readSubjects() {
  if (!fs.existsSync(SUBJECTS_FILE)) {
    fs.writeFileSync(SUBJECTS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(SUBJECTS_FILE, 'utf-8'));
}

function writeSubjects(list) {
  fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// --------------- public API ---------------

function getAllSubjects() {
  return readSubjects();
}

function getSubjectById(id) {
  return readSubjects().find((s) => s.id === id) || null;
}

function getOrCreateSubject(name) {
  const list = readSubjects();
  const existing = list.find((s) => s.name === name);
  if (existing) return existing;

  const subject = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
    name,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    files: [],
    examStyle: null,
  };
  list.push(subject);
  writeSubjects(list);
  return subject;
}

/** 更新科目信息 */
function updateSubject(id, updates) {
  const list = readSubjects();
  const subject = list.find((s) => s.id === id);
  if (!subject) return null;
  if (updates.name) subject.name = updates.name;
  if (updates.examStyle !== undefined) subject.examStyle = updates.examStyle;
  writeSubjects(list);
  return subject;
}

/** 删除文件 */
function removeFileFromSubject(subjectId, fileId) {
  const list = readSubjects();
  const subject = list.find((s) => s.id === subjectId);
  if (!subject || !subject.files) return false;
  const idx = subject.files.findIndex((f) => f.id === fileId);
  if (idx === -1) return false;
  subject.files.splice(idx, 1);
  writeSubjects(list);
  return true;
}

function deleteSubject(id) {
  const list = readSubjects();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  const subject = list[idx];
  list.splice(idx, 1);
  writeSubjects(list);

  // 级联删除关联数据
  const knFile = path.join(__dirname, '..', 'data', 'knowledge.json');
  const wqFile = path.join(__dirname, '..', 'data', 'wrongQuestions.json');
  if (fs.existsSync(knFile)) {
    const kn = JSON.parse(fs.readFileSync(knFile, 'utf-8'));
    fs.writeFileSync(knFile, JSON.stringify(kn.filter((k) => k.subjectId !== id), null, 2), 'utf-8');
  }
  if (fs.existsSync(wqFile)) {
    const wq = JSON.parse(fs.readFileSync(wqFile, 'utf-8'));
    fs.writeFileSync(wqFile, JSON.stringify(wq.filter((w) => w.subjectId !== id), null, 2), 'utf-8');
  }
  return true;
}

function updateLastAccessed(subjectId) {
  const list = readSubjects();
  const subject = list.find((s) => s.id === subjectId);
  if (!subject) return null;
  subject.lastAccessed = new Date().toISOString();
  writeSubjects(list);
  return subject;
}

function getLastSubject() {
  const list = readSubjects();
  if (list.length === 0) return null;
  return list.sort((a, b) => new Date(b.lastAccessed || 0) - new Date(a.lastAccessed || 0))[0];
}

/** 向科目添加文件 */
function addFileToSubject(subjectId, fileInfo) {
  const list = readSubjects();
  const subject = list.find((s) => s.id === subjectId);
  if (!subject) return null;
  if (!subject.files) subject.files = [];
  const entry = {
    id: fileInfo.id,
    name: fileInfo.name,
    type: fileInfo.type || 'material',
    path: fileInfo.path,
    size: fileInfo.size,
    uploadedAt: fileInfo.uploadedAt || new Date().toISOString(),
    fileType: fileInfo.fileType || 'material',
    hasAnswers: fileInfo.hasAnswers || false,
    chapter: fileInfo.chapter || '',
  };
  subject.files.push(entry);
  writeSubjects(list);
  return entry;
}

/** 获取科目的文件列表 */
function getSubjectFiles(subjectId, type) {
  const subject = getSubjectById(subjectId);
  if (!subject || !subject.files) return [];
  return type ? subject.files.filter((f) => f.type === type) : subject.files;
}

/** 设置科目的出题风格 */
function setSubjectExamStyle(subjectId, style) {
  const list = readSubjects();
  const subject = list.find((s) => s.id === subjectId);
  if (!subject) return null;
  subject.examStyle = style;
  writeSubjects(list);
  return subject;
}

/** 获取科目出题风格 */
function getSubjectExamStyle(subjectId) {
  const subject = getSubjectById(subjectId);
  return subject ? subject.examStyle : null;
}

module.exports = {
  getAllSubjects,
  getOrCreateSubject,
  deleteSubject,
  updateLastAccessed,
  getLastSubject,
  getSubjectById,
  addFileToSubject,
  getSubjectFiles,
  removeFileFromSubject,
  setSubjectExamStyle,
  getSubjectExamStyle,
  updateSubject,
};
