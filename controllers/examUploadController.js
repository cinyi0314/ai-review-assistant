const path = require('path');
const fs = require('fs');
const { extractText } = require('../utils/fileParser');
const { setSubjectExamStyle, addFileToSubject } = require('../services/subjectService');
const axios = require('axios');

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const STYLES_FILE = path.join(__dirname, '..', 'data', 'examStyles.json');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位专业的考试出题风格分析师。请分析以下多份试卷的合并内容，总结统一的出题风格。

请从以下维度分析：
1. questionTypes — 题型分布
2. knowledgeAreas — 知识点侧重
3. difficulty — 难度
4. optionPattern — 选项设计特点
5. detectedTypes — 检测到的题型列表（如 ["选择题", "判断题"]）

请严格按照 JSON 格式返回：
{
  "questionTypes": "...",
  "knowledgeAreas": "...",
  "difficulty": "...",
  "optionPattern": "...",
  "detectedTypes": ["选择题", "判断题"]
}`;

function readDocuments() {
  if (!fs.existsSync(DOCUMENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf-8'));
}

function readStyles() {
  if (!fs.existsSync(STYLES_FILE)) {
    fs.writeFileSync(STYLES_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(STYLES_FILE, 'utf-8'));
}

function writeStyles(list) {
  fs.writeFileSync(STYLES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// --------------- handler ---------------
async function handleUploadExams(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请选择要上传的试卷文件' });
  }

  const { subjectId } = req.body;

  try {
    // 1. 提取所有文件文本
    const texts = [];
    for (const file of req.files) {
      const t = await extractText(file.path);
      texts.push(t);
    }
    const combinedText = texts.join('\n\n---\n\n');

    // 2. 调用 DeepSeek 分析合并出题风格
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'API Key 未配置' });
    }

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请分析以下试卷的出题风格：\n\n${combinedText}` },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    const aiMessage = response.data?.choices?.[0]?.message?.content;
    let style = {
      questionTypes: '多份试卷综合分析',
      knowledgeAreas: '综合分析',
      difficulty: '综合分析',
      optionPattern: '综合分析',
      detectedTypes: ['选择题', '判断题'],
    };

    if (aiMessage) {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          style = {
            questionTypes: parsed.questionTypes || style.questionTypes,
            knowledgeAreas: parsed.knowledgeAreas || style.knowledgeAreas,
            difficulty: parsed.difficulty || style.difficulty,
            optionPattern: parsed.optionPattern || style.optionPattern,
            detectedTypes: Array.isArray(parsed.detectedTypes)
              ? parsed.detectedTypes
              : style.detectedTypes,
          };
        } catch { /* keep defaults */ }
      }
    }

    // 3. 持久化风格
    const record = {
      fileId: `batch-${Date.now().toString(36)}`,
      style,
      learnedAt: new Date().toISOString(),
      sourceCount: req.files.length,
    };
    const styles = readStyles();
    styles.push(record);
    writeStyles(styles);

    // 4. 存入 subject.examStyle + subject.files
    if (subjectId) {
      setSubjectExamStyle(subjectId, style);
      req.files.forEach((file) => {
        addFileToSubject(subjectId, {
          id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
          name: file.originalname,
          type: 'exam',
          path: file.path,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          fileType: 'exam_range',
          hasAnswers: false,
          chapter: '',
        });
      });
    }

    res.json({
      message: `已学习 ${req.files.length} 份试卷的出题风格`,
      style: record.style,
      sourceCount: record.sourceCount,
    });
  } catch (err) {
    console.error('Batch exam learning error:', err.message);
    res.status(500).json({ error: `批量学习失败：${err.message}` });
  }
}

module.exports = { handleUploadExams };
