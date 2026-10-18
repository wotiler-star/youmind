"""数据库引擎、会话与数据模型 (SQLAlchemy 2.0 + SQLite)。"""
import os
import datetime
from urllib.parse import urlparse

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# 默认使用应用目录内的 SQLite 文件；生产环境可通过 DATABASE_URL 覆盖为绝对路径并由 volume 持久化
DEFAULT_DB_PATH = "sqlite:///./data/youmind.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_PATH)


def _sqlite_file_path(url: str) -> str:
    """从 SQLAlchemy 风格的连接串中取出 SQLite 文件真实路径。

    关键细节：sqlite:///./data/youmind.db 的「///」之后是相对路径 ./data/youmind.db，
    不能用 urlparse().path 直接取（会得到 /./data/youmind.db 这种带前导斜杠、
    被当成绝对路径的串，导致建错目录而真正连接时目录不存在、启动失败）。
    """
    if "///" not in url:
        return os.path.normpath("./youmind.db")
    path_part = url.split("///", 1)[1]
    return os.path.normpath(path_part)


_file_path = _sqlite_file_path(DATABASE_URL)
_dir = os.path.dirname(_file_path)
if _dir:
    os.makedirs(_dir, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="未命名项目")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
