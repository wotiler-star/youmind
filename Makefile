# YouMind 常用命令（make <target>）

up:        ## 构建并后台启动所有服务
	docker compose up -d --build

down:      ## 停止服务（保留数据卷）
	docker compose down

restart:   ## 重启所有服务
	docker compose restart

logs:      ## 实时查看日志
	docker compose logs -f

ps:        ## 查看服务状态
	docker compose ps

deploy:    ## 一键部署（等价于 ./deploy.sh）
	./deploy.sh

pull:      ## 仅拉取/构建镜像
	docker compose build

clean:     ## 停止并删除数据卷（⚠️ 会清空所有数据）
	docker compose down -v

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.PHONY: up down restart logs ps deploy pull clean help
