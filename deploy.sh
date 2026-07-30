#!/usr/bin/env bash
# YouMind 一键部署脚本（自托管 VPS / 云服务器）
set -euo pipefail

PORT="${PORT:-8080}"

echo "🚀 YouMind 一键部署开始..."

# 1. 若没有 .env，则从模板复制
if [ ! -f .env ]; then
  echo "📄 未检测到 .env，已从 .env.example 生成"
  cp .env.example .env
fi

# 2. 构建并后台启动
echo "🐳 构建镜像并启动服务（首次会拉取基础镜像，请稍候）..."
docker compose up -d --build

# 3. 等待健康检查通过
echo "⏳ 等待服务就绪..."
for i in $(seq 1 30); do
  if docker compose ps | grep -q "healthy"; then
    break
  fi
  sleep 2
done

echo ""
echo "✅ 部署完成！"
echo "   前端访问： http://localhost:${PORT}"
echo "   后端 API： http://localhost:${PORT}/api/projects"
echo "   健康检查： http://localhost:${PORT}/healthz"
echo ""
echo "常用命令："
echo "  查看日志： docker compose logs -f"
echo "  停止服务： docker compose down"
echo "  完全清理： docker compose down -v"
