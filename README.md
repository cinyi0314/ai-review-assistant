# 📚 AI 期末复习助手

基于 DeepSeek API 的智能复习助手 — 上传学习资料，AI 自动生成知识点和练习题，支持错题本和遗忘曲线复习。

## 启动

```bash
# 后端 (http://localhost:3000)
npm install
# 编辑 .env，填入 DEEPSEEK_API_KEY
npm start

# 前端 (http://localhost:5173)
cd client
npm install
npm run dev
```

## 功能

| 功能 | 说明 |
|---|---|
| 📤 文件上传 | 支持 .txt / .pdf，10MB 限制 |
| 🤖 AI 生成题目 | 提取文本 → DeepSeek 生成 5 个知识点 + 3 道题 |
| 🎯 自定义题型 | 选择题 / 判断题 / 简答题，可混合 |
| 📄 出题风格学习 | 上传往年试卷，AI 模仿其出题风格 |
| ❌ 错题本 | 标记错题 → 查看 → 重做后移除 |
| 🔔 遗忘曲线复习 | 基于 1/2/4/7/15 天间隔，自动提醒复习 |
| 📖 知识点复习模式 | 随机卡片展示，标记掌握/未掌握 |

## API 一览

| 方法 | 路由 | 说明 |
|---|---|---|
| `GET` | `/ping` | 健康检查 |
| `POST` | `/api/upload` | 上传文件 (multipart, field: `file`) |
| `POST` | `/api/generate` | 生成复习内容 |
| `POST` | `/api/learn-exam-style` | 学习出题风格 |
| `POST` | `/api/wrong-questions` | 保存错题 |
| `GET` | `/api/wrong-questions/:fileId` | 获取错题 |
| `DELETE` | `/api/wrong-questions/:id` | 删除错题 |
| `GET` | `/api/knowledge/:fileId` | 获取知识点（含掌握状态） |
| `PUT` | `/api/knowledge/:id/toggle` | 切换掌握状态 |
| `GET` | `/api/due-reviews/:fileId` | 获取待复习错题 |
| `POST` | `/api/due-reviews` | 记录复习完成 |

## 项目结构

```
├── server.js                     # Express 入口
├── routes/                       # HTTP 层
│   ├── upload.js, generate.js    # 上传、生成
│   ├── wrongQuestion.js          # 错题 CRUD
│   ├── examLearning.js           # 出题风格学习
│   ├── knowledge.js              # 知识点掌握
│   └── memoryCurve.js            # 遗忘曲线复习
├── controllers/                  # 业务层
├── services/                     # 外部 API + 数据层
│   ├── aiService.js              # DeepSeek API
│   ├── wrongQuestionService.js   # 错题读写
│   ├── knowledgeService.js       # 知识点读写
│   ├── memoryCurveService.js     # 艾宾浩斯遗忘曲线
│   └── examLearningService.js    # 出题风格分析
├── utils/fileParser.js           # .txt/.pdf 文本提取
├── data/                         # JSON 文件存储（首次运行自动创建）
│   ├── documents.json            # 上传文件记录
│   ├── generateResults.json      # AI 生成结果
│   ├── wrongQuestions.json       # 错题记录
│   ├── examStyles.json           # 出题风格
│   └── knowledge.json            # 知识点掌握状态
├── client/                       # React + Vite 前端
│   └── src/App.jsx               # 单文件应用
└── uploads/                      # 上传文件存储
```

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + Express 5, multer, axios, pdf-parse |
| 前端 | React 19 + Vite 8 |
| AI | DeepSeek API (chat completions) |
| 存储 | File-based JSON |
