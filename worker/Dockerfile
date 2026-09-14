# Worker de vídeo de Compás. Construir y arrancar desde la raíz del repo:
#   docker compose up -d --build      (o: podman compose up -d --build)
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild ffmpeg-static
COPY worker ./worker
USER node
CMD ["node", "worker/worker.mjs"]
