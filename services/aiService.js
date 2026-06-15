const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位专业的复习助手。请根据用户提供的学习资料，生成结构化的复习内容。

要求：
1. 提炼 5 个核心知识点，简洁准确。
2. 根据资料内容生成 3 道单选题（4 个选项），题目要有区分度，附带正确答案和解析。

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
 * @returns {Promise<object>} 结构化复习内容
 */
async function generateReviewContent(text) {
  if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY not configured');
    return DEFAULT_RESPONSE;
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请根据以下资料生成复习内容：\n\n${text}` },
        ],
        temperature: 0.7,
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
      questions: parsed.questions.slice(0, 3),
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

module.exports = { generateReviewContent };
