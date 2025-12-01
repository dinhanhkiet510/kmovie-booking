import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../css/Login.css"; // Tận dụng lại CSS của trang Login cho đồng bộ

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Gọi API Backend gửi mail reset password
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra.");

      setMessage("Link đặt lại mật khẩu đã được gửi vào email của bạn.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h3 className="login-title">Quên Mật Khẩu</h3>
        
        <p className="text-muted small text-center mb-4">
            Nhập email đã đăng ký của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
        </p>

        {message && <div className="alert alert-success text-center p-2">{message}</div>}
        {error && <div className="alert alert-danger text-center p-2">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email đăng ký:</label>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="vidu@gmail.com"
                required 
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </form>

        <p className="login-register mt-3">
           <Link to="/login">Quay lại Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}