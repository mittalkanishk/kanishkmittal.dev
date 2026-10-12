# Local container, plus the release and deploy steps the GitHub workflows run.
.PHONY: help up down git-tag-release release-image deploy require-release-version

PORT ?= 4321
export PORT

# The version is the tag on the current commit. CI passes it explicitly.
VERSION ?= $(shell git describe --tags --exact-match 2>/dev/null || echo dev)
RELEASE_IMAGE_REPO ?= kanishkmittal55/kanishkmittal-dev
DOCKER_PLATFORMS ?= linux/amd64

help:
	@echo "Local:"
	@echo "  make up                 build the image and start the site on http://localhost:$(PORT)"
	@echo "  make down               stop and remove the container and its network (the image is kept)"
	@echo "                          another port: make up PORT=8080"
	@echo ""
	@echo "Release:"
	@echo "  make git-tag-release    tag main and push the tag; the Release workflow does the rest"
	@echo "                          skip the prompt: make git-tag-release TAG=v1.2.3"
	@echo ""
	@echo "Steps the workflows run (usable by hand with VERSION=v1.2.3):"
	@echo "  make release-image      build the image and push it as $(RELEASE_IMAGE_REPO):VERSION"
	@echo "  make deploy             point the Railway service at that image and wait for the deployment"

# --wait returns once the container's health check passes, so the URL is live.
up:
	docker compose up --build --detach --wait
	@echo ""
	@echo "Portfolio running at http://localhost:$(PORT)"

down:
	docker compose down --remove-orphans

git-tag-release:
	@./scripts/tag-release.sh $(TAG)

require-release-version:
	@echo "$(VERSION)" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$$' || \
	  { echo "VERSION must be a release tag like v1.2.3 (got '$(VERSION)')." >&2; exit 1; }

# Needs a Docker Hub login that can push to $(RELEASE_IMAGE_REPO).
release-image: require-release-version
	docker buildx build --push \
	  --platform $(DOCKER_PLATFORMS) \
	  --tag $(RELEASE_IMAGE_REPO):$(VERSION) \
	  --tag $(RELEASE_IMAGE_REPO):latest \
	  .

# Needs RAILWAY_SERVICE_ID and a Railway token in the environment; see scripts/railway-deploy.sh.
deploy: require-release-version
	@IMAGE=$(RELEASE_IMAGE_REPO):$(VERSION) ./scripts/railway-deploy.sh
