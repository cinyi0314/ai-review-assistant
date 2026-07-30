const { learnExamStyle } = require('../services/examLearningService');
const { setSubjectExamStyle, addFileToSubject } = require('../services/subjectService');
const { create: createCustomType } = require('../services/customQuestionTypeService');
const fs = require('fs');
const path = require('path');

async function handleLearnExamStyle(req, res) {
  const { fileId, subjectId } = req.body;

  const result = await learnExamStyle(fileId);

  // 自动保存识别到的新题型到 customQuestionTypes.json
  if (result.style?.newTypes && Array.isArray(result.style.newTypes)) {
    result.style.newTypes.forEach((nt) => {
      try {
        createCustomType({ name: nt.name, description: nt.description, example: nt.example, optionsTemplate: nt.optionsTemplate });
      } catch { /* 重复则跳过 */ }
    });
  }

  // 将风格存入 subject.examStyle
  if (subjectId && result.style) {
    const docsFile = path.join(__dirname, '..', 'data', 'documents.json');
    if (fs.existsSync(docsFile)) {
      const docs = JSON.parse(fs.readFileSync(docsFile, 'utf-8'));
      const doc = docs.find((d) => d.id === fileId);
      if (doc) {
        addFileToSubject(subjectId, {
          id: doc.id,
          name: doc.originalName,
          type: 'exam',
          path: doc.path,
          size: doc.size,
          uploadedAt: doc.uploadedAt,
        });
      }
    }
  }

  if (result.error) {
    const statusMap = {
      '缺少 fileId 参数': 400,
      '未找到该文件记录': 404,
      '暂不支持此格式': 400,
      '文件读取失败': 500,
      'PDF 解析功能尚未实现': 400,
    };
    return res.status(statusMap[result.error] || 500).json({ error: result.error });
  }

  res.json(result);
}

module.exports = { handleLearnExamStyle };
