import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { GoogleLogin } from '@react-oauth/google'; // 1. Import Google Button
import "../css/Login.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API_URL = "http://localhost:5000/api/auth";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // --- XỬ LÝ ĐĂNG NHẬP THƯỜNG ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

      handleLoginSuccess(data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = async (credentialResponse) => {
      setMessage("");
      setLoading(true);
      try {
          // Gửi credential (token của Google) về Backend để xác thực
          const res = await fetch(`${API_URL}/google-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: credentialResponse.credential }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Google Login thất bại");

          handleLoginSuccess(data);
      } catch (err) {
          console.error("Google Error:", err);
          setMessage("Lỗi đăng nhập Google. Vui lòng thử lại.");
      } finally {
          setLoading(false);
      }
  };

  // Hàm chung để lưu user và chuyển hướng
  const handleLoginSuccess = (data) => {
      login(data.user, data.accessToken || data.token, data.refreshToken || null);
      
      if (["admin", "staff"].includes(data.user.type)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h3 className="login-title">Đăng nhập</h3>
        {message && <p className="login-error">{message}</p>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <PasswordField label="Password" name="password" value={form.password} onChange={handleChange} />
          
          <div className="d-flex justify-content-end mb-3">
            <Link to="/forgot-password" style={{ fontSize: "0.9rem", color: "#d63384", textDecoration: "none" }}>
              Quên mật khẩu?
            </Link>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        {/* --- NÚT GOOGLE LOGIN --- */}
        <div className="google-login-wrapper mt-3 d-flex flex-column align-items-center">
            <p className="text-muted small mb-2">Hoặc đăng nhập bằng</p>
            <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => setMessage("Đăng nhập Google thất bại")}
                useOneTap
                width="100%"
                theme="filled_blue"
                shape="pill"
            />
        </div>
        {/* ------------------------ */}

        <p className="login-register mt-3">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}

function InputField({ label, name, type, value, onChange }) { 
  return (
    <div className="form-group">
      <label>{label}:</label>
      <input type={type} name={name} value={value} onChange={onChange} required />
    </div>
  ); 
}
function PasswordField({ label, name, value, onChange }) { 
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="form-group password-group">
      <label>{label}:</label>
      <div className="password-input-wrapper">
        <input type={showPassword ? "text" : "password"} name={name} value={value} onChange={onChange} required />
        <span className="toggle-password" onClick={() => setShowPassword(prev => !prev)}>{showPassword ? <FiEyeOff /> : <FiEye />}</span>
      </div>
    </div>
  ); 
}

export default Login;