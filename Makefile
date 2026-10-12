# Runs the portfolio as a container: nginx serving the static build.
.PHONY: help up down

PORT ?= 4321
export PORT

help:
	@echo "make up     build the image and start the site on http://localhost:$(PORT)"
	@echo "make down   stop and remove the container and its network (the image is kept)"
	@echo ""
	@echo "Another port: make up PORT=8080"

# --wait returns once the container's health check passes, so the URL is live.
up:
	docker compose up --build --detach --wait
	@echo ""
	@echo "Portfolio running at http://localhost:$(PORT)"

down:
	docker compose down --remove-orphans
