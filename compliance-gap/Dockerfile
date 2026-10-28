# Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

# Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /build
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Final image
FROM node:18-alpine
WORKDIR /app

# Copy frontend dist
COPY --from=frontend-builder /build/frontend/dist ./public

# Copy backend
COPY --from=backend-builder /build/backend/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package*.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]

