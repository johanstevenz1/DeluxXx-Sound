FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM python:3.13-slim
WORKDIR /app/backend
COPY backend/requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY backend/app ./app
COPY --from=frontend /build/dist /app/frontend/dist
ENV PORT=8000
EXPOSE 8000
CMD ["python", "-m", "app.serve"]

