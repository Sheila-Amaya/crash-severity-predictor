# syntax=docker/dockerfile:1.7
# Frontend: Node compila la SPA y nginx la sirve (con proxy de /api).

# -- Compilación -----------------------------------------------------
FROM node:22.12.0-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Vacía = la API en el mismo origen (/api, vía el proxy de nginx)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build \
 && node scripts/csp-hash.mjs dist/index.html > /app/csp-hashes.txt

# -- Servidor --------------------------------------------------------
FROM nginx:1.28-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/csp-hashes.txt /tmp/csp-hashes.txt
# Inserta en la CSP el hash del script inline del tema
RUN hashes="$(cat /tmp/csp-hashes.txt)" \
 && sed -i "s|__CSP_SCRIPT_HASHES__|${hashes}|" /etc/nginx/conf.d/default.conf \
 && ! grep -q __CSP_SCRIPT_HASHES__ /etc/nginx/conf.d/default.conf \
 && rm /tmp/csp-hashes.txt \
 && nginx -t
COPY --from=compilacion /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
