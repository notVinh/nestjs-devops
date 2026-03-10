# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Cài đặt công cụ build cho Debian (Sửa lỗi exit code: 127 của apk)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run (Môi trường chạy bot)
FROM node:20-slim

# Cài đặt Chromium và các font chữ hỗ trợ tiếng Việt
# Đây là phần quan trọng nhất để Puppeteer hiển thị đúng nút "Tiếp tục đăng nhập"
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Cấu hình biến môi trường để Puppeteer nhận diện đúng Chromium hệ thống
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copy các file cần thiết từ stage builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/mail/mail-templates ./src/mail/mail-templates

# Mở port cho ứng dụng
EXPOSE 5000

# Lệnh chạy ứng dụng
CMD ["npm", "run", "start:prod"]