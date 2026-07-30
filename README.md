# YouMind · AI 创作工作室（一比一复刻）

一个现代化 AI 辅助创作平台，帮助用户管理项目、捕捉灵感、并随时调用 AI 进行整理与创作。
本仓库在 [easyspace-ai/youmind](https://github.com/easyspace-ai/youmind) 开源结构基础上，补齐了**真正可一键部署**的容器化与云平台配置。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 + Tailwind CSS（nginx 托管，生产构建） |
| 后端 | Python FastAPI + SQLAlchemy 2.0 + SQLite（uvicorn） |
| 部署 | Docker / Docker Compose / Nginx 反代 / Railway / Render / Vercel / Fly.io |

## 项目结构

```
.
├── docker-compose.yml     # 一键编排：frontend + backend + 健康检查 + 数据卷
├── deploy.sh              # 自托管一键部署脚本
├── Makefile               # make up / down / deploy / logs ...
├── railway.json           # Railway 一键部署
├── render.yaml            # Render 一键部署
├── vercel.json            # Vercel 前端部署
├── fly.toml               # Fly.io 后端部署
├── .env.example           # 环境变量模板
├── frontend/              # React + Vite 前端（含 Dockerfile / nginx 模板）
├── backend/               # FastAPI 后端（含 Dockerfile）
└── README_DEPLOY.md       # 完整部署文档
```

## 快速开始（一键部署）

```bash
# 自托管（需要 Docker）
./deploy.sh
# 访问 http://localhost:8080
```

云平台一键部署：导入仓库到 Railway / Render / Vercel，读取对应配置文件即可。详见 **[README_DEPLOY.md](./README_DEPLOY.md)**。

## 本地开发

```bash
cd backend && pip install -r requirements.txt && python init_db.py && uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## 功能

- ✅ 项目（Board）的创建 / 编辑 / 删除 / 搜索，内容自动保存
- ✅ AI 助手流式对话（未配置 Key 时走回显模式，功能链路完整）
- ✅ 生产级容器化、健康检查、数据持久化、环境变量驱动的反代
