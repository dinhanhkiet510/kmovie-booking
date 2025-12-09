import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  // Thêm state loading để tránh giao diện bị nháy khi F5
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const loadUser = async () => {
      const storedAccess = localStorage.getItem("accessToken");
      const storedRefresh = localStorage.getItem("refreshToken");
      const storedUser = localStorage.getItem("user");

      // 1. Nếu không có token thì thôi, dừng loading
      if (!storedAccess) {
        setLoading(false);
        return;
      }

      // 2. Set tạm dữ liệu từ LocalStorage để giao diện hiển thị ngay (Optimistic UI)
      if (storedUser) setUser(JSON.parse(storedUser));
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);

      // 3. QUAN TRỌNG: Gọi API để xác thực lại với Server (Check Admin/User chuẩn)
      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${storedAccess}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Cập nhật lại User mới nhất từ DB (đảm bảo role, type đúng)
          setUser(data.user);
          // Lưu ngược lại vào localStorage để đồng bộ
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // Token hết hạn hoặc không hợp lệ -> Logout ngay
          console.log("Token không hợp lệ, logout...");
          logout();
        }
      } catch (error) {
        console.error("Lỗi xác thực khi load trang:", error);
        logout(); // Lỗi mạng hoặc server -> Logout cho an toàn
      } finally {
        setLoading(false); // Kết thúc quá trình load
      }
    };

    loadUser();
  }, []);

  const login = (userData, access, refresh) => {
    setUser(userData);
    setAccessToken(access);
    setRefreshToken(refresh);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    // Có thể reload trang hoặc redirect về login nếu cần
    // window.location.href = "/login"; 
  };

  const getAccessToken = () => accessToken;
  const getRefreshToken = () => refreshToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        loading,
        login,
        logout,
        getAccessToken,
        getRefreshToken,
      }}
    >
      {/* Chỉ hiển thị App khi đã check xong token  */}
      {!loading && children} 
    </AuthContext.Provider>
  );
};