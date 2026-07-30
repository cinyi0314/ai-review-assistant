# AI 复习助手 — 部署指南

## 前置条件

- GitHub 账号，项目已推送到 GitHub 仓库
- DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 获取）

---

## 第一步：推送到 GitHub

```bash
cd D:\ai-review-assistant
git add -A
git commit -m "deploy: add Vercel + Render deployment configs"
git push origin master
```

如果还没创建 GitHub 远程仓库：

```bash
# 在 github.com 创建新仓库后执行
git remote add origin https://github.com/你的用户名/ai-review-assistant.git
git branch -M master
git push -u origin master
```

---

## 第二步：后端部署到 Render

### 2.1 注册 Render

打开 [render.com](https://render.com)，用 GitHub 账号登录。

### 2.2 创建 Web Service

1. 点击 **New +** → **Web Service**
2. 选择 **Connect a repository** → 选择 `ai-review-assistant`
3. 填写配置：

| 字段 | 值 |
|---|---|
| Name | `ai-review-assistant-backend`（自动生成） |
| Root Directory | 留空（项目根目录） |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |

4. **免费方案**：选择 **Free** plan

### 2.3 配置环境变量

在 **Environment Variables** 中添加：

```
DEEPSEEK_API_KEY = your_deepseek_api_key_here
```

> ⚠️ 不要直接粘贴这里的关键词，换成你自己的 DeepSeek API Key

### 2.4 部署

点击 **Create Web Service**，等待 2-3 分钟。

部署完成后，你会获得一个后端 URL：
```
https://ai-review-assistant-backend.onrender.com
```

### 2.5 验证后端

复制你的后端 URL，在浏览器中访问：
```
https://你的地址.onrender.com/ping
```
应该返回 `{"message":"pong"}`。

> ⚠️ Render 免费实例 15 分钟无请求会休眠，首次请求需等待 30-60 秒唤醒。

---

## 第三步：前端部署到 Vercel

### 3.1 注册 Vercel

打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录。

### 3.2 导入项目

1. 点击 **Add New...** → **Project**
2. 选择 `ai-review-assistant` 仓库
3. 配置如下：

| 字段 | 值 |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | `client` |
| Build Command | `npm run build`（自动） |
| Output Directory | `dist`（自动） |

### 3.3 配置环境变量

添加：

```
VITE_API_BASE = https://你的地址.onrender.com
```

> 把 `https://你的地址.onrender.com` 替换成 Render 给你的真实 URL

### 3.4 部署

点击 **Deploy**，等待 1-2 分钟。

部署完成后，你会获得前端 URL：
```
https://ai-review-assistant-xxx.vercel.app
```

---

## 第四步：验证部署

1. 打开前端 URL（Vercel 给的地址）
2. 输入课程名称，点击"创建并继续"
3. 上传一个 .txt 或 .pdf 文件
4. 点击"生成复习内容"
5. 确认知识点、生成题目、答题交互全部正常

### 如果遇到问题

| 问题 | 检查 |
|---|---|
| 前端页面空白 | Vercel 部署时 Root Directory 是否选 `client` |
| API 调用 404 | `VITE_API_BASE` 是否包含 `/api` 后缀（**不应该包含**，代码会自动拼接） |
| 跨域 CORS 报错 | 后端 `server.js` 已启用 `cors()`，确认没有注释掉 |
| 后端 502 | Render 免费实例正在休眠，等 30 秒刷新 |
| 生成超时 | DeepSeek API 最长 60s，Vite 代理已设 120s，Vercel 无代理限制 |

---

## 目录结构（部署后）

```
ai-review-assistant/
├── server.js              # Render 启动入口
├── controllers/           # 后端业务逻辑
├── services/              # AI + 数据服务
├── routes/                # API 路由
├── data/                  # JSON 文件存储（⚠️ Render 免费实例重启会丢失）
├── uploads/               # 上传文件（⚠️ 同上）
├── render.yaml            # Render 配置
├── client/                # Vercel 部署的根目录
│   ├── vercel.json        # Vercel 配置
│   ├── .env.example       # 前端环境变量模板
│   └── src/App.jsx        # VITE_API_BASE 环境变量
└── DEPLOY.md              # 本文件
```

> ⚠️ **重要提示：** Render 免费方案的存储是临时的。`data/*.json` 和 `uploads/` 中的数据在服务重启后会丢失。正式使用建议接入数据库（如 MongoDB Atlas 免费版）和云存储（如 Cloudflare R2）。

---

## 成本预估

| 服务 | 方案 | 费用 |
|---|---|---|
| Render (后端) | Free | $0/月，15 分钟无请求休眠 |
| Vercel (前端) | Hobby | $0/月 |
| DeepSeek API | 按量计费 | 约 ¥0.002/千 token，个人使用几块钱/月 |
| **合计** | | **~$0-3/月** |
