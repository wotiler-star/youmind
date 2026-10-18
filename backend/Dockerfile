FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 默认使用官方 PyPI；如需加速可传入 --build-arg PIP_INDEX=<镜像地址>
ARG PIP_INDEX=https://pypi.org/simple
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt -i ${PIP_INDEX}

COPY . .

# SQLite 数据目录（生产用 volume 持久化）
RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
