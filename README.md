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
- ✅ **多语言 SEO**：每个语言独立可抓取 URL + hreflang + 内链 + 站点地图

## 多语言 SEO（独立 URL / hreflang / 内链 / 站点地图）

每种语言拥有**独立、可被搜索引擎抓取**的 URL（子目录策略），并配套完整的 SEO 信号：

| 语言 | 独立 URL | hreflang |
| --- | --- | --- |
| 简体中文 | `/zh-CN/` | `zh-CN` |
| English | `/en/` | `en` |
| 日本語 | `/ja/` | `ja` |
| Español | `/es/` | `es` |
| Français | `/fr/` | `fr` |

实现要点：
- **可抓取的独立 URL**：构建期由 `frontend/scripts/build-i18n-pages.mjs` 预渲染出 `dist/<lang>/index.html`，HTML 内直接包含**完整译文**（hero / 功能 / 步骤 / 页脚），无需执行 JS 即可被抓取。
- **hreflang 备用链接**：每个落地页 `<head>` 含全部语言的 `<link rel="alternate" hreflang="…">` 与 `x-default`，指向 `/zh-CN/`。
- **canonical + Open Graph + JSON-LD**：每个页面有独立 canonical、OG 标签与结构化数据（WebSite / SoftwareApplication，含 `availableLanguage`）。
- **内链（语言切换器）**：每个落地页都互相链接到其它语言的独立 URL，形成内部链接网络；工作台 `/app` 顶栏也内链回各语言落地页。
- **站点地图**：后端 `GET /sitemap.xml` 动态生成，列出全部语言 URL 并以 `<xhtml:link hreflang>` 互相关联（绝对地址取 `SITE_URL` 环境变量，缺省回退到请求 host）。
- **robots.txt**：`GET /robots.txt` 放行全站并声明 `Sitemap: /sitemap.xml`。
- **nginx**：`/sitemap.xml`、`/robots.txt` 反代到后端；`/<lang>/` 提供预渲染落地页；`/app` 提供 SPA 工作台外壳 `app.html`。

> 生产部署前请设置站点域名：前端构建 `SITE_URL=https://yourdomain.com npm run build`（落地页的绝对 hreflang/canonical 由此生成）；后端运行时 `SITE_URL=https://yourdomain.com`（站点地图绝对地址）。不设置时回退到占位域名/请求 host。

本地查看效果：

```bash
cd frontend && SITE_URL=https://localhost npm run build
# 预渲染产物：dist/zh-CN/index.html、dist/en/index.html … dist/app.html
python3 -m http.server 4173 -d dist   # 访问 /zh-CN/ /en/ 等
```
