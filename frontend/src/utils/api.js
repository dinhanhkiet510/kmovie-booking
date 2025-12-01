import axios from "axios";

// Hàm tạo API instance
export const createApi = (onLogout) => {
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // 1. Request Interceptor: Luôn lấy token mới nhất từ LocalStorage
  api.interceptors.request.use(
    (config) => {
      // QUAN TRỌNG: Đọc trực tiếp từ localStorage, không phụ thuộc vào tham số truyền vào
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 2. Response Interceptor: Xử lý Refresh Token
  api.interceptors.response.use(
    (response) => response,
    async (err) => {
      const originalRequest = err.config;

      // Nếu lỗi 401 (Hết hạn) và chưa thử lại
      if (err.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Lấy Refresh Token từ Storage
          const refreshToken = localStorage.getItem("refreshToken");
          
          if (!refreshToken) throw new Error("No refresh token");

          // Gọi API Refresh
          const { data } = await axios.post("http://localhost:5000/api/auth/refresh-token", {
            refreshToken: refreshToken,
          });

          // Lưu token mới
          localStorage.setItem("accessToken", data.accessToken);
          
          // Gắn token mới và gọi lại request cũ
          originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
          return api(originalRequest);

        } catch (e) {
          // Nếu refresh cũng lỗi (403) -> Logout sạch sẽ
          console.error("Phiên đăng nhập hết hạn:", e);
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          
          if (onLogout) onLogout();
          return Promise.reject(e);
        }
      }

      return Promise.reject(err);
    }
  );

  return api;
};