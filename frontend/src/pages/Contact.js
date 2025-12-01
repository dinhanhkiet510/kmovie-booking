import React, { useState } from "react";
import "../css/Contact.css";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Vui lòng nhập tên.";
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return "Vui lòng nhập email hợp lệ.";
    if (!form.message.trim()) return "Vui lòng nhập nội dung tin nhắn.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    const err = validate();
    if (err) {
      setStatus({ type: "error", message: err });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Lỗi khi gửi. Vui lòng thử lại sau.");
      setForm({ name: "", email: "", subject: "", message: "", phone: "" });
      setStatus({ type: "success", message: "Gửi liên hệ thành công — cảm ơn bạn!" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Left: Form */}
        <div className="contact-form">
          <h2>Liên hệ với chúng tôi</h2>
          <p>Có thắc mắc? Gửi tin nhắn và chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.</p>

          {status && (
            <div
              className={
                status.type === "success" ? "alert-success" : "alert-error"
              }
            >
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>Họ & tên</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
            />

            <label>Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              type="email"
            />

            <label>Số điện thoại</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+84 9xx xxx xxx"
              type="tel"
            />

            <label>Tiêu đề</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Vấn đề, đề nghị, ..."
            />

            <label>Nội dung</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              placeholder="Viết nội dung ở đây..."
            />

            <div className="contact-buttons">
              <button type="submit" disabled={loading} className="contact-btn">
                {loading ? "Đang gửi..." : "Gửi liên hệ"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ name: "", email: "", subject: "", message: "", phone: "" })
                }
                className="contact-reset"
              >
                Xóa
              </button>
            </div>
          </form>

          <div className="mt-6" style={{ marginTop: "20px"}}>
            <p>Hoặc liên hệ trực tiếp:</p>
            <ul>
              <li>
                Email:{" "}
                <a href="mailto:hello@example.com">dinhanhkiet510@gmail.com</a>
              </li>
              <li>
                Điện thoại:{" "}
                <a href="tel:+84900000000">+84 973154127</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Info */}
        <div className="contact-info">
          <div>
            <h3>Thông tin công ty</h3>
            <p>6/14 Bùi Thị Xuân, Phường Sơn Hòa, TP.HCM</p>

            <div>
              <p className="text-sm font-medium">Giờ làm việc</p>
              <p>Thứ 2 - Thứ 6: 8:30 - 17:30</p>
            </div>

            <div className="socials">
              <a href="#">Facebook</a>
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>

          <iframe
            title="company-location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1234567890123!2d106.700!3d10.777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f0000000001%3A0xabcdef1234567890!2sHo%20Chi%20Minh%20City!5e0!3m2!1sen!2s!4v0000000000000"
            width="100%"
            height="220"
            style={{ border: 0, borderRadius: "12px", marginTop: "20px" }}
            allowFullScreen={false}
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
