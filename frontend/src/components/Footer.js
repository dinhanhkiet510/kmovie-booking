
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  FaFacebookF,
  FaGoogle,
  FaEnvelope,
  FaPhoneAlt,
} from "react-icons/fa";
import "../css/Footer.css";

function Footer() {
  return (
    <footer
      className="text-light pt-5 pb-3 mt-auto"
      style={{
        background: "black",
      }}
    >
      <div className="container">
        {/* --- Top navigation section --- */}
        <div className="row text-center text-md-start mb-4">
          {/* Logo + giới thiệu */}
          <div className="col-md-4 mb-3">
            <h4 className="fw-bold text-uppercase mb-3 text-pink">Movie Booking</h4>
            <p className="small">
              Đặt vé nhanh chóng – Xem lịch chiếu – Review phim mới nhất.
              Trải nghiệm xem phim tiện lợi chỉ với vài cú nhấp chuột.
            </p>
          </div>

          {/* Menu giống header */}
          <div className="col-md-4 mb-3">
            <h6 className="fw-bold text-uppercase mb-3">Khám phá</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-light text-decoration-none d-block mb-2">Trang chủ</a></li>
              <li><a href="/showtimes" className="text-light text-decoration-none d-block mb-2">Lịch chiếu</a></li>
              <li><a href="/theaters" className="text-light text-decoration-none d-block mb-2">Rạp chiếu phim</a></li>
              <li><a href="/contact" className="text-light text-decoration-none d-block mb-2">Liên hệ</a></li>
              <li><a href="/login" className="text-light text-decoration-none d-block">Đăng nhập</a></li>
            </ul>
          </div>

          {/* Kết nối & liên hệ */}
          <div className="col-md-4 mb-3">
            <h6 className="fw-bold text-uppercase mb-3">Kết nối với chúng tôi</h6>
            <div className="d-flex flex-column align-items-center align-items-md-start gap-2">
              <a href="https://facebook.com" className="text-light text-decoration-none d-flex align-items-center gap-2">
                <FaFacebookF /> Facebook
              </a>
              <a href="https://google.com" className="text-light text-decoration-none d-flex align-items-center gap-2">
                <FaGoogle /> Google
              </a>
              <a href="mailto:support@moviebooking.vn" className="text-light text-decoration-none d-flex align-items-center gap-2">
                <FaEnvelope /> support@moviebooking.vn
              </a>
              <a href="tel:+84912345678" className="text-light text-decoration-none d-flex align-items-center gap-2">
                <FaPhoneAlt /> Hotline: 0912 345 678
              </a>
            </div>
          </div>
        </div>

        <hr className="bg-light" />

        {/* --- Bottom section --- */}
        <div className="row text-center text-md-start align-items-center">
          <div className="col-md-6 mb-2 mb-md-0">
            <p className="mb-0 small">© 2025 MovieBooking. All rights reserved.</p>
          </div>
          <div className="col-md-6 text-md-end">
            <a href="/privacy" className="text-light text-decoration-none me-3 small">
              Chính sách bảo mật
            </a>
            <a href="/terms" className="text-light text-decoration-none small">
              Điều khoản sử dụng
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
