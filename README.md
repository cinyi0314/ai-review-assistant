# AI Review Assistant

基于 DeepSeek API 的智能复习助手，上传学习资料后自动生成知识点和练习题。

## 已完成接口

| 方法 | 路由 | 说明 |
|---|---|---|
| `GET` | `/ping` | 健康检查 → `{ message: "pong" }` |
| `POST` | `/api/upload` | 单文件上传 (multipart, field: `file`)，存入 `uploads/`，记录写入 `data/documents.json` |
| `POST` | `/api/generate` | 传入 `{ fileId }`，提取文本 → DeepSeek 生成知识点 + 单选题，结果存入 `data/generateResults.json` |

## 项目结构

```
├── server.js                         # 入口，Express 配置
├── routes/
│   ├── upload.js                     # multer 配置 + 上传路由
│   └── generate.js                   # 生成路由
├── controllers/
│   ├── uploadController.js           # 上传业务逻辑
│   └── generateController.js         # 生成业务逻辑（提取文本 → AI → 持久化）
├── services/
│   └── aiService.js                  # DeepSeek API 调用
├── utils/
│   └── fileParser.js                 # 文件文本提取（目前支持 .txt）
├── data/
│   ├── documents.json                # 上传文件记录
│   └── generateResults.json          # AI 生成结果记录
└── uploads/                          # 上传文件存储目录
```

## 启动

```bash
npm install
# 配置 .env 中的 DEEPSEEK_API_KEY
npm start
```

## 下一步计划

- [ ] 前端页面（文件上传 + 复习内容展示 + 答题交互）
- [ ] 扩展 `fileParser` 支持 PDF / DOCX / 图片 OCR
- [ ] 支持用户自定义题目数量和知识点数量
- [ ] 生成结果支持重新生成和多次保存
- [ ] 增加文件类型过滤和更精细的错误提示
