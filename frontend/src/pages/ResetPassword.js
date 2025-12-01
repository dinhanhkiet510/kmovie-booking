import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "../css/Login.css"; // Tận dụng lại CSS của trang Login

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Lấy token từ URL

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra xem có token không khi vừa vào trang
  useEffect(() => {
    if (!token) {
      setError("Link không hợp lệ hoặc thiếu token.");
    }
  }, [token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
        setError("Link không hợp lệ.");
        return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (form.newPassword.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: form.newPassword }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Đặt lại mật khẩu thất bại.");

      setMessage("Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...");
      
      // Tự động chuyển trang sau 3 giây
      setTimeout(() => {
          navigate("/login");
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nếu không có token thì không hiện form
  if (!token) {
      return (
          <div className="login-page">
              <div className="login-container text-center">
                  <h3 className="login-title text-danger">Lỗi Đường Dẫn</h3>
                  <p>Link đặt lại mật khẩu này không hợp lệ hoặc đã bị thiếu thông tin.</p>
                  <Link to="/forgot-password" className="btn btn-primary mt-3">Yêu cầu lại link mới</Link>
              </div>
          </div>
      );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h3 className="login-title">Đặt Lại Mật Khẩu</h3>
        
        {message && <div className="alert alert-success p-2 text-center">{message}</div>}
        {error && <div className="alert alert-danger p-2 text-center">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <PasswordField 
            label="Mật khẩu mới" 
            name="newPassword" 
            value={form.newPassword} 
            onChange={handleChange} 
          />
          
          <PasswordField 
            label="Xác nhận mật khẩu" 
            name="confirmPassword" 
            value={form.confirmPassword} 
            onChange={handleChange} 
          />

          <button type="submit" className="login-button" disabled={loading || !!message}>
            {loading ? "Đang xử lý..." : "Đổi Mật Khẩu"}
          </button>
        </form>
        
        <p className="login-register mt-3 text-center">
          <Link to="/login">Quay lại Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

// Component nhập mật khẩu (Tái sử dụng logic ẩn/hiện)
function PasswordField({ label, name, value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group password-group">
      <label>{label}:</label>
      <div className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          required
          placeholder="Nhập mật khẩu mới..."
        />
        <span
          className="toggle-password"
          onClick={() => setShowPassword(prev => !prev)}
          style={{cursor: 'pointer'}}
        >
          {showPassword ? <FiEyeOff /> : <FiEye />}
        </span>
      </div>
    </div>
  );
}