import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Load từ localStorage khi reload trang
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedAccess = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedUser && storedAccess) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
    }
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
  };

  const getAccessToken = () => accessToken;
  const getRefreshToken = () => refreshToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        login,
        logout,
        getAccessToken,
        getRefreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
