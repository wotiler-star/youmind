"""YouMind 后端入口 (FastAPI)。

提供服务：
- GET  /health               健康检查（供 docker / 平台健康检查使用）
- GET  /api/projects         项目列表（支持 ?q= 关键字搜索）
- POST /api/projects         创建项目
- GET  /api/projects/{id}    项目详情
- PUT  /api/projects/{id}    更新项目
- DELETE /api/projects/{id}  删除项目
- POST /api/chat             流式 AI 对话
"""
import os
from contextlib import asynccontextmanager
from urllib.parse import urljoin

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session

from app import ai, schemas
from app.db import Project, get_db, init_db

# 多语言清单（需与前端 src/locales + scripts/build-i18n-pages.mjs 保持一致）
LANGS = ["zh-CN", "en", "ja", "es", "fr"]
DEFAULT_LANG = "zh-CN"

ALLOWED_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="YouMind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "youmind-backend"}


@app.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt():
    # 站点地图由本服务动态生成；SITE_URL 用于绝对地址，缺省回退到请求 host
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Sitemap: /sitemap.xml\n"
    )


@app.get("/sitemap.xml")
def sitemap(request: Request):
    # 域名优先级：环境变量 SITE_URL > 请求 host（适配一键部署未知域名场景）
    site_url = (os.getenv("SITE_URL") or str(request.base_url).rstrip("/")).rstrip("/")

    url_entries = []
    for code in LANGS:
        loc = f"{site_url}/{code}/"
        alternates = []
        for alt in LANGS:
            alternates.append(
                f'    <xhtml:link rel="alternate" hreflang="{alt}" href="{site_url}/{alt}/" />'
            )
        alternates.append(
            f'    <xhtml:link rel="alternate" hreflang="x-default" href="{site_url}/{DEFAULT_LANG}/" />'
        )
        url_entries.append(
            "  <url>\n"
            f"    <loc>{loc}</loc>\n"
            + "\n".join(alternates)
            + "\n  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(url_entries)
        + "\n</urlset>\n"
    )
    return Response(content=xml, media_type="application/xml")


@app.get("/api/projects", response_model=list[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), q: str = Query(None)):
    query = db.query(Project)
    if q:
        query = query.filter(Project.title.contains(q))
    return query.order_by(Project.updated_at.desc()).all()


@app.post("/api/projects", response_model=schemas.ProjectOut, status_code=201)
def create_project(p: schemas.ProjectCreate, db: Session = Depends(get_db)):
    obj = Project(title=p.title, content=p.content)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@app.get("/api/projects/{pid}", response_model=schemas.ProjectOut)
def get_project(pid: int, db: Session = Depends(get_db)):
    obj = db.get(Project, pid)
    if not obj:
        raise HTTPException(status_code=404, detail="项目不存在")
    return obj


@app.put("/api/projects/{pid}", response_model=schemas.ProjectOut)
def update_project(pid: int, p: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    obj = db.get(Project, pid)
    if not obj:
        raise HTTPException(status_code=404, detail="项目不存在")
    if p.title is not None:
        obj.title = p.title
    if p.content is not None:
        obj.content = p.content
    db.commit()
    db.refresh(obj)
    return obj


@app.delete("/api/projects/{pid}", status_code=204)
def delete_project(pid: int, db: Session = Depends(get_db)):
    obj = db.get(Project, pid)
    if not obj:
        raise HTTPException(status_code=404, detail="项目不存在")
    db.delete(obj)
    db.commit()


@app.post("/api/chat")
async def chat(payload: dict):
    message = payload.get("message", "")
    history = payload.get("history")
    return StreamingResponse(
        ai.stream_chat(message, history), media_type="text/plain; charset=utf-8"
    )
