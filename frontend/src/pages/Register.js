import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import "../css/Register.css";

function Register() {
  // 1. Thêm trường mới vào state
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    birth_date: "", 
    gender: "Nam" // Mặc định chọn Nam
  });
  
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Nếu backend trả về token ngay sau khi reg (tùy logic backend của bạn)
      // Nếu backend chỉ trả về "Thành công", thì chuyển sang trang login
      if (data.accessToken) {
          login(data.user, data.accessToken, data.refreshToken);
          navigate("/");
      } else {
          alert("Đăng ký thành công! Vui lòng đăng nhập.");
          navigate("/login");
      }
      
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2 className="register-title">Đăng ký thành viên</h2>
        {message && <p className="register-error">{message}</p>}
        
        <form className="register-form" onSubmit={handleSubmit}>
          {/* Họ tên */}
          <div className="form-group">
            <label>Họ và tên <span className="text-danger">*</span></label>
            <input 
                type="text" 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="Nguyễn Văn A" 
                required 
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email <span className="text-danger">*</span></label>
            <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="email@example.com" 
                required 
            />
          </div>

          {/* Số điện thoại (MỚI) */}
          <div className="form-group">
            <label>Số điện thoại <span className="text-danger">*</span></label>
            <input 
                type="tel" 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="090xxxxxxx" 
                required 
            />
          </div>

          {/* Ngày sinh & Giới tính (MỚI - Gom chung 1 dòng cho gọn) */}
          <div style={{ display: "flex", gap: "15px" }}>
            <div className="form-group" style={{ flex: 1 }}>
                <label>Ngày sinh</label>
                <input 
                    type="date" 
                    name="birth_date" 
                    value={form.birth_date} 
                    onChange={handleChange} 
                />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
                <label>Giới tính</label>
                <select 
                    name="gender" 
                    value={form.gender} 
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                </select>
            </div>
          </div>

          {/* Mật khẩu */}
          <div className="form-group">
            <label>Mật khẩu <span className="text-danger">*</span></label>
            <input 
                type="password" 
                name="password" 
                value={form.password} 
                onChange={handleChange} 
                required 
            />
          </div>

          <button type="submit" className="register-button">Đăng ký ngay</button>
        </form>
        
        <p className="register-login">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}

export default Register;