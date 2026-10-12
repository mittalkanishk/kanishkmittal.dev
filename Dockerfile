# Build the static site.
FROM node:22-alpine AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

# Dependencies first, so editing the site does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve it. This nginx image runs as a non-root user.
FROM nginxinc/nginx-unprivileged:stable-alpine

# Hosts such as Railway set PORT. The image fills it into the nginx config at start-up.
ENV PORT=8080
COPY config/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/" || exit 1
