from app import db

if __name__ == "__main__":
    db.init_db()
    print("✅ YouMind 数据库已初始化 (SQLite)")
