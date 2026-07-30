# YouMind 一键部署指南

本项目提供 **四类开箱即用的「一键部署」方式**，核心配置均为**真实可用**（带健康检查、环境变量注入、数据持久化），而非占位文件。

| 方式 | 适用场景 | 难度 | 说明 |
| --- | --- | --- | --- |
| **Docker Compose**（自托管） | 自己的服务器 / VPS / 本地 | ⭐ | 一条命令 `./deploy.sh` 拉起全套 |
| **Railway** | 想点一下就上线 | ⭐ | 用 `railway.json`，保留 compose 网络 |
| **Render** | 免费托管全栈 | ⭐⭐ | 用 `render.yaml` 创建前后端两个服务 |
| **Vercel + 外部后端** | 前端要上 Vercel 边缘网络 | ⭐⭐ | `vercel.json` 部署前端，后端另部署 |

> 无论哪种方式，前端都通过 `BACKEND_URL` 环境变量把 `/api` 反代到后端，因此**同一套前端镜像在本地和云平台通用**。

---

## 1. 自托管（Docker Compose）—— 推荐

### 环境要求
- Docker 20.10+ 且 Docker Compose v2
- （可选）一个 OpenRouter API Key，用于真正的 AI 对话

### 一键启动
```bash
# 方式 A：脚本（自动生成 .env 并等待健康检查）
./deploy.sh

# 方式 B：直接用 make
make deploy

# 方式 C：原生命令
docker compose up -d --build
```

启动后访问 **http://localhost:8080** （端口由 `.env` 的 `PORT` 控制，默认 8080）。

### 常用命令
```bash
make ps       # 查看运行状态
make logs     # 实时日志
make down     # 停止（保留数据）
make clean    # 停止并清空数据卷（⚠️ 会删除所有数据）
```

### 配置（`.env`）
| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `8080` | 对外访问端口 |
| `OPENROUTER_API_KEY` | 空 | 不填则 AI 走「回显模式」，应用功能完整 |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | AI 网关 |
| `DEFAULT_MODEL` | `openrouter/google/gemini-3-pro-preview` | 默认模型 |
| `DATABASE_URL` | `sqlite:////app/data/youmind.db` | SQLite 路径（数据卷持久化） |
| `CORS_ALLOW_ORIGINS` | `*` | 生产建议改为具体域名 |

数据保存在 Docker 卷 `youmind-data` 中，重启/升级不会丢失。

---

## 2. Railway（点一下上线）

1. 在 Railway 新建 Project → **Deploy from GitHub repo** → 选择本仓库。
2. Railway 读取 `railway.json`，使用 `dockercompose` builder 部署整个 compose（前后端共享网络，`backend:8000` 可直接解析）。
3. 在 Railway 控制台为 `youmind-backend` 服务添加环境变量 `OPENROUTER_API_KEY`（如需 AI）。
4. 生成域名后即可访问。

> 健康检查路径 `/healthz` 已内置，Railway 会自动探测。

---

## 3. Render（免费全栈）

1. Render 控制台 → **New** → **Blueprint** → 关联本仓库。
2. Render 读取 `render.yaml`，自动创建 `youmind-backend`（FastAPI）和 `youmind-frontend`（nginx 静态 + 反代）两个 Web 服务。
3. 前端服务通过 `fromService` 自动获得后端公开 URL 作为 `BACKEND_URL`。
4. （可选）在 `youmind-backend` 的环境变量里填入 `OPENROUTER_API_KEY`。

> 注意：Render 免费实例会休眠，首次访问后端可能有几秒冷启动。

---

## 4. Vercel（仅前端）+ 外部后端

`vercel.json` 会把 `/api/*` 重写到 `BACKEND_URL` 指向的后端（后端可部署在 Railway/Render/Fly 任意一处）。

```bash
# 在 Vercel 项目设置里添加环境变量：
#   BACKEND_URL = https://你的后端地址
vercel --prod
```

---

## 5. 本地开发（不走容器）

```bash
# 后端
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload --port 8000

# 前端（另开终端）
cd frontend
npm install
npm run dev   # http://localhost:5173
```

---

## 健康检查与探测
- 前端：`GET /healthz` → `200 ok`
- 后端：`GET /health` → `{"status":"ok","service":"youmind-backend"}`

各平台 / docker 均用上述端点做存活探针。
