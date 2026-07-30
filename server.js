require('dotenv').config();

const express = require('express');
const cors = require('cors');

const uploadRoutes = require('./routes/upload');
const filesRoutes = require('./routes/files');
const answerSourceRoutes = require('./routes/answerSource');
const customQuestionTypeRoutes = require('./routes/customQuestionType');
const knowledgePointsRoutes = require('./routes/knowledgePoints');
const generateRoutes = require('./routes/generate');
const wrongQuestionRoutes = require('./routes/wrongQuestion');
const examLearningRoutes = require('./routes/examLearning');
const knowledgeRoutes = require('./routes/knowledge');
const memoryCurveRoutes = require('./routes/memoryCurve');
const subjectRoutes = require('./routes/subject');
const uploadExamsRoutes = require('./routes/upload-exams');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- routes ---------------
app.get('/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/upload-exams', uploadExamsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/answer-sources', answerSourceRoutes);
app.use('/api/custom-question-types', customQuestionTypeRoutes);
app.use('/api/knowledge-points', knowledgePointsRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/wrong-questions', wrongQuestionRoutes);
app.use('/api/learn-exam-style', examLearningRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/due-reviews', memoryCurveRoutes);
app.use('/api/subjects', subjectRoutes);

// --------------- error handling ---------------
// 404 — 未匹配任何路由
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理（Express 5 自动捕获 async 错误）
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
});

// --------------- start ---------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`DeepSeek API key ${process.env.DEEPSEEK_API_KEY ? 'loaded' : 'NOT SET'}`);
});

// 兜底：进程级未捕获异常，防止进程崩溃后无响应
process.on('uncaughtException', (err) => {
  console.error('FATAL - uncaughtException:', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('FATAL - unhandledRejection:', reason);
});
