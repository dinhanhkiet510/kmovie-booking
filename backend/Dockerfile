# 1. Chọn môi trường Node.js
FROM node:18-alpine

# 2. Tạo thư mục làm việc
WORKDIR /app

# 3. Copy file package để cài thư viện trước (tận dụng cache của Docker)
COPY package*.json ./

# 4. Cài đặt thư viện
RUN npm install

# 5. Copy toàn bộ code nguồn vào
COPY . .

# 6. Mở port 5000
EXPOSE 5000

# 7. Lệnh chạy server
CMD ["npm", "start"]