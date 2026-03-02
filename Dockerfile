# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt công cụ build cho Alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run (Quan trọng nhất)
FROM node:20-alpine

# Cài đặt Chromium và các thư viện cần thiết trực tiếp trên Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Biến môi trường để Puppeteer biết dùng Chromium có sẵn của hệ thống
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env .env 

EXPOSE 5000

CMD ["npm", "run", "start:prod"]