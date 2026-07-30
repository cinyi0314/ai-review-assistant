const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// --------------- 题型格式说明 ---------------
const TYPE_SPECS = {
  选择题: `- 选择题：options 为 ["A. xxx", "B. xxx", "C. xxx", "D. xxx"]，answer 填选项字母如 "A"`,
  判断题: `- 判断题：options 固定为 ["正确", "错误"]，answer 填 "正确" 或 "错误"`,
  简答题: `- 简答题：options 为空数组 []，answer 填参考答案文本`,
};

/**
 * 根据题型生成动态系统提示词
 * @param {string[]} questionTypes - 题型数组，如 ['选择题', '判断题']
 * @returns {string} 系统提示词
 */
function buildSystemPrompt(questionTypes, questionCount = 3) {
  const types = questionTypes.length > 0 ? questionTypes : ['选择题', '判断题'];
  const typeNames = types.join('、');

  // 加载自定义题型
  let customTypes = [];
  try {
    const path = require('path');
    const fs = require('fs');
    const file = path.join(__dirname, '..', 'data', 'customQuestionTypes.json');
    if (fs.existsSync(file)) {
      customTypes = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch { /* ignore */ }

  const typeRules = types
    .map((t) => {
      const builtin = TYPE_SPECS[t];
      if (builtin) return builtin;
      const custom = customTypes.find((ct) => ct.name === t);
      if (custom) {
        const optTpl = custom.optionsTemplate
          ? `options 为 ${JSON.stringify(custom.optionsTemplate)}`
          : 'options 格式根据题目特点自行设计（数组）';
        return `- ${custom.name}：${custom.description}。${optTpl}。answer 填正确答案。示例：${custom.example || '无'}`;
      }
      return TYPE_SPECS['选择题'];
    })
    .join('\n');

  return `你是一位专业的复习助手。请根据用户提供的学习资料，生成结构化的复习内容。

要求：
1. 提炼 5 个核心知识点，简洁准确。
2. 根据资料内容生成 ${questionCount} 道题目，题型仅限：${typeNames}（可混合出题）。
3. 必须严格按照用户提供的资料内容提取知识点，不要添加资料中未提及的内容，不要发散。

各题型格式规范：
${typeRules}

请严格按照以下 JSON 格式返回，不要包含任何其他文字：

{
  "knowledgePoints": ["知识点1", "知识点2", "知识点3", "知识点4", "知识点5"],
  "questions": [
    {
      "question": "题目的题干",
      "options": ["A. xxx", "B. xxx", "C. xxx", "D. xxx"],
      "answer": "A",
      "explanation": "解析说明"
    }
  ]
}`;
}

// --------------- 默认回退值 ---------------
const DEFAULT_RESPONSE = {
  knowledgePoints: ['暂时无法生成知识点，请稍后重试'],
  questions: [
    {
      question: '服务暂不可用',
      options: ['A. -', 'B. -', 'C. -', 'D. -'],
      answer: 'A',
      explanation: 'AI 服务暂时不可用，请稍后重试',
    },
  ],
};

/**
 * 调用 DeepSeek API 生成复习内容
 * @param {string} text - 用户上传资料的纯文本内容
 * @param {object} [options] - 可选配置
 * @param {string[]} [options.questionTypes] - 题型数组，默认 ['选择题', '判断题']
 * @param {object} [options.examStyle] - 出题风格（来自 examLearningService）
 * @returns {Promise<object>} 结构化复习内容
 */
async function generateReviewContent(text, options = {}) {
  const { questionTypes = [], examStyle = null, questionCount = 3 } = options;

  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return DEFAULT_RESPONSE;
  }

  const systemPrompt = buildSystemPrompt(questionTypes, questionCount);

  // 构建 user message，可融入出题风格
  let userMessage = `请根据以下资料生成复习内容：\n\n${text}`;
  if (examStyle && examStyle.questionTypes) {
    userMessage += `\n\n请参考以下出题风格：\n- 题型分布偏向：${examStyle.questionTypes}\n- 知识点侧重：${examStyle.knowledgeAreas}\n- 难度：${examStyle.difficulty}\n- 选项设计：${examStyle.optionPattern}`;
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000, // 60s 超时
      }
    );

    const aiMessage = response.data?.choices?.[0]?.message?.content;
    if (!aiMessage) {
      console.error('Empty response from DeepSeek API');
      return DEFAULT_RESPONSE;
    }

    // 尝试从回复中提取 JSON（处理可能夹杂的 markdown 代码块）
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', aiMessage);
      return DEFAULT_RESPONSE;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 校验必填字段
    if (!Array.isArray(parsed.knowledgePoints) || !Array.isArray(parsed.questions)) {
      console.error('Invalid response structure:', parsed);
      return DEFAULT_RESPONSE;
    }

    return {
      knowledgePoints: parsed.knowledgePoints.slice(0, 5),
      questions: parsed.questions.slice(0, questionCount),
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('DeepSeek API request timeout');
    } else if (err.response) {
      console.error('DeepSeek API error:', err.response.status, err.response.data);
    } else {
      console.error('DeepSeek API request failed:', err.message);
    }
    return DEFAULT_RESPONSE;
  }
}

/**
 * 仅提取知识点，不生成题目
 * @param {string} text - 资料文本
 * @returns {Promise<string[]>} 知识点数组
 */
async function extractKnowledgeOnly(text) {
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return [];
  }
  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '请从以下资料中提取所有核心知识点，以 JSON 数组格式返回，每个知识点一句完整的话。返回格式：{ "knowledgePoints": ["知识点1", "知识点2", ...] }，不要包含其他文字。' },
        { role: 'user', content: `请提取以下资料的知识点：\n\n${text.slice(0, 8000)}` },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      timeout: 60000,
    });
    const aiMsg = response.data?.choices?.[0]?.message?.content;
    if (!aiMsg) return [];
    const m = aiMsg.match(/\{[\s\S]*\}/);
    if (!m) return [];
    try { return JSON.parse(m[0]).knowledgePoints || []; }
    catch { return []; }
  } catch (err) {
    console.error('extractKnowledgeOnly error:', err.message);
    return [];
  }
}

module.exports = { generateReviewContent, buildSystemPrompt, extractKnowledgeOnly };
