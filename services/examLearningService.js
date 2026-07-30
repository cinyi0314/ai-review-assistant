const axios = require('axios');
const path = require('path');
const fs = require('fs');

const { extractText } = require('../utils/fileParser');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const DOCUMENTS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const STYLES_FILE = path.join(__dirname, '..', 'data', 'examStyles.json');

const SYSTEM_PROMPT = `你是一位专业的考试出题风格分析师。请根据用户提供的学习资料或试题内容，分析其出题风格。

请从以下维度分析：
1. questionTypes — 题型分布（如选择题、判断题、简答题的大致比例和特点）
2. knowledgeAreas — 知识点侧重（主要考察哪些知识领域）
3. difficulty — 题目难度（简单/中等/困难的比例，难度梯度如何）
4. optionPattern — 选项设计特点（选项长度、迷惑性、常见陷阱等）
5. detectedTypes — 从资料中识别出的具体题型列表（如 ["选择题", "判断题"]，不要包含资料中没有的题型）
6. newTypes — 如果识别出不属于常见题型（选择题/判断题/简答题）的新题型，列出其名称、描述和示例格式。格式：[{ "name": "完形填空", "description": "一段文字中挖去若干词，从选项中选择正确的填入", "example": "The cat ___ on the mat. A. sit B. sits C. sat D. sitting", "optionsTemplate": ["A. ","B. ","C. ","D. "] }]。无新题型则返回空数组 []。

请严格按照以下 JSON 格式返回，不要包含任何其他文字：

{
  "questionTypes": "题型分布描述",
  "knowledgeAreas": "知识点侧重描述",
  "difficulty": "难度分析描述",
  "optionPattern": "选项设计特点描述",
  "detectedTypes": ["选择题", "判断题"],
  "newTypes": []
}`;

const DEFAULT_STYLE = {
  questionTypes: '无法分析题型分布',
  knowledgeAreas: '无法分析知识点侧重',
  difficulty: '无法分析难度',
  optionPattern: '无法分析选项设计',
  detectedTypes: ['选择题', '判断题'],
  newTypes: [],
};

// --------------- helpers ---------------
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

// --------------- public API ---------------

/**
 * 分析文件的出题风格
 * @param {string} fileId - 上传文件的 ID
 * @returns {Promise<object>} 分析结果
 */
async function learnExamStyle(fileId) {
  if (!fileId) {
    return { error: '缺少 fileId 参数' };
  }

  // 查找文件记录
  const docs = readDocuments();
  const doc = docs.find((d) => d.id === fileId);
  if (!doc) {
    return { error: '未找到该文件记录' };
  }

  // 格式校验
  const ext = path.extname(doc.originalName).toLowerCase();
  if (ext !== '.txt' && ext !== '.pdf') {
    return { error: '暂不支持此格式，请上传 txt 或 pdf 文件' };
  }

  // 提取文本（fileParser 统一处理 .txt / .pdf）
  let text;
  try {
    text = await extractText(doc.path);
  } catch (err) {
    console.error('Failed to extract text:', err.message);
    return { error: '文件读取失败' };
  }

  // 调用 DeepSeek API 分析出题风格
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return {
      fileId,
      style: DEFAULT_STYLE,
      learnedAt: new Date().toISOString(),
      fallback: true,
    };
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请分析以下资料的出题风格：\n\n${text}` },
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
    let style = DEFAULT_STYLE;

    if (aiMessage) {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          style = {
            questionTypes: parsed.questionTypes || DEFAULT_STYLE.questionTypes,
            knowledgeAreas: parsed.knowledgeAreas || DEFAULT_STYLE.knowledgeAreas,
            difficulty: parsed.difficulty || DEFAULT_STYLE.difficulty,
            optionPattern: parsed.optionPattern || DEFAULT_STYLE.optionPattern,
            detectedTypes: Array.isArray(parsed.detectedTypes)
              ? parsed.detectedTypes
              : DEFAULT_STYLE.detectedTypes,
            newTypes: Array.isArray(parsed.newTypes) ? parsed.newTypes : [],
          };
        } catch { /* 解析失败用默认值 */ }
      }
    }

    // 持久化
    const record = {
      fileId,
      style,
      learnedAt: new Date().toISOString(),
    };
    const styles = readStyles();
    // 如果已有该 fileId 的分析，替换旧记录
    const idx = styles.findIndex((s) => s.fileId === fileId);
    if (idx !== -1) styles[idx] = record;
    else styles.push(record);
    writeStyles(styles);

    return record;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('DeepSeek API request timeout');
    } else if (err.response) {
      console.error('DeepSeek API error:', err.response.status);
    } else {
      console.error('DeepSeek API request failed:', err.message);
    }
    return {
      fileId,
      style: DEFAULT_STYLE,
      learnedAt: new Date().toISOString(),
      fallback: true,
    };
  }
}

module.exports = { learnExamStyle };
