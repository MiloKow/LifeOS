# Docker commands
.PHONY: up down build rebuild logs shell db-shell clean

# Start containers
up:
	docker-compose up -d

# Start with logs visible
up-logs:
	docker-compose up

# Stop containers
down:
	docker-compose down

# Build containers
build:
	docker-compose build

# Rebuild from scratch (no cache)
rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

# View logs
logs:
	docker-compose logs -f app

# Shell into app container
shell:
	docker-compose exec app sh

# Shell into database
db-shell:
	docker-compose exec db psql -U postgres -d vie_perso

# Run prisma commands
prisma-migrate:
	docker-compose exec app npx prisma migrate dev

prisma-generate:
	docker-compose exec app npx prisma generate

prisma-studio:
	docker-compose exec app npx prisma studio

# Clean everything (WARNING: deletes DB data)
clean:
	docker-compose down -v
	docker system prune -f

# Development (local, no docker)
.PHONY: dev install

dev:
	npm run dev

install:
	npm install

# Help
help:
	@echo "Available commands:"
	@echo "  make up          - Start containers in background"
	@echo "  make up-logs     - Start containers with logs"
	@echo "  make down        - Stop containers"
	@echo "  make build       - Build containers"
	@echo "  make rebuild     - Full rebuild (no cache)"
	@echo "  make logs        - View app logs"
	@echo "  make shell       - Shell into app container"
	@echo "  make db-shell    - Shell into database"
	@echo "  make clean       - Remove all containers and volumes"
	@echo "  make dev         - Run locally without Docker"
