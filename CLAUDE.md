# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # 启动服务器 (node server.js)
npx nodemon server.js  # 开发模式，文件变更自动重启
```

## Architecture

三层 Express 应用，基于 CommonJS 模块：

```
routes/           # HTTP 层：multer 配置、请求校验、错误转换
    ↕
controllers/      # 业务层：组装服务调用、读写 data/*.json、构造响应
    ↕
services/         # 外部 API 调用 (DeepSeek)
utils/            # 纯函数工具 (文件解析)
```

**关键规则：** 路由层处理 HTTP 关注点（multer、状态码），controller 处理业务逻辑（查找记录、持久化），不交叉。

## Data flow

```
POST /api/upload (file)
  → routes/upload.js: multer 保存到 uploads/, 字段名 "file"
  → controllers/uploadController.js: 生成 id, 写入 data/documents.json
  → 返回 { message, id }

POST /api/generate ({ fileId })
  → controllers/generateController.js:
      1. 查 data/documents.json 找对应 id → 文件路径
      2. 调 utils/fileParser.extractText(path) → 文本
      3. 调 services/aiService.generateReviewContent(text) → AI 结果
      4. 结果追加写入 data/generateResults.json
  → 返回 { knowledgePoints, questions }
```

## File-based JSON store

`data/` 目录下两个 JSON 文件作为轻量存储：
- `data/documents.json` — 上传文件记录数组，每条 `{ id, originalName, path, size, uploadedAt }`
- `data/generateResults.json` — 生成结果数组，每条 `{ fileId, generatedAt, result }`

读写模式：read helper 在文件不存在时自动创建 `[]`，write helper 以 2 空格缩进覆盖写入。无并发保护，单用户场景足够。

## Error handling conventions

- Controller 返回中文错误消息，状态码 400/404/413/500
- `services/aiService.js` 任何失败都返回 `DEFAULT_RESPONSE` 而非抛异常 — 调用方无需 try-catch
- `utils/fileParser.js` 不支持 .txt 以外的格式时 resolve 提示字符串而非 reject — 调用方仍需处理真正的 IO 错误 (reject)

## DeepSeek API

- URL: `https://api.deepseek.com/v1/chat/completions`
- 兼容 OpenAI chat completions 格式
- System prompt 硬编码在 `services/aiService.js` 顶部，要求返回 `{ knowledgePoints, questions }` JSON
- 回复解析兼容 markdown 代码块包裹的 JSON (`/\{[\s\S]*\}/`)
- 超时 60s，temperature 0.7，model: `deepseek-chat`
