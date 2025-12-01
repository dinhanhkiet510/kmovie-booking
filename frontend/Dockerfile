# --- Stage 1: Build React App ---
FROM node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build ra thư mục tĩnh (build/)
RUN npm run build

# --- Stage 2: Serve bằng Nginx ---
FROM nginx:1.21-alpine as production-stage
# Copy file build từ Stage 1 sang thư mục của Nginx
COPY --from=build-stage /app/build /usr/share/nginx/html
# Copy cấu hình Nginx vào container
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]