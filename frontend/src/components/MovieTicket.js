import React from 'react';
import { FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import '../css/MovieTicket.css'; 

const MovieTicket = ({ ticket, onClose }) => {
  if (!ticket) return null;

  // Format ngày giờ
  const date = new Date(ticket.show_date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = ticket.show_time ? ticket.show_time.toString().slice(0, 5) : "--:--";
  const defaultImage = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=60";

  // --- LOGIC KIỂM TRA TRẠNG THÁI ---
  const isCheckedIn = ticket.status === 'CHECKED_IN';
  
  // Kiểm tra hết hạn (Logic tương tự Backend để hiển thị UI)
  const showDateTime = new Date(ticket.show_date);
  if (ticket.show_time) {
      const [hours, minutes] = ticket.show_time.toString().split(':');
      showDateTime.setHours(hours, minutes, 0);
  }
  // Hết hạn nếu quá giờ chiếu 30p
  const isExpired = !isCheckedIn && (new Date() > new Date(showDateTime.getTime() + 30 * 60000));

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-wrapper" onClick={(e) => e.stopPropagation()}>
        
        <button className="close-ticket-btn" onClick={onClose}>
            <FaTimes />
        </button>
        
        {/* --- TRÁI: POSTER --- */}
        <div className="ticket-left">
          <div className="poster-container">
             <img 
                src={ticket.poster_url || defaultImage} 
                alt={ticket.movie_title}
                onError={(e) => {e.target.onerror = null; e.target.src = defaultImage}} 
             />
          </div>
          <div className="ticket-info-left">
            <h2 className="movie-title">{ticket.movie_title || "TÊN PHIM"}</h2>
            <p className="cinema-name"><FaMapMarkerAlt style={{marginRight: '5px'}}/> {ticket.theater_name}</p>
            <div className="ticket-tags">
                <span className="tag">2D</span>
                <span className="tag">Phụ đề</span>
            </div>
          </div>
          <div className="circle-cutout top"></div>
          <div className="circle-cutout bottom"></div>
        </div>

        {/* --- PHẢI: CHI TIẾT & QR --- */}
        <div className="ticket-right">
          <div className="ticket-header-right">
            <span className="logo-text">CINEMA TICKET</span>
          </div>
          
          <div className="ticket-details-grid">
            <div className="detail-item">
              <label>NGÀY CHIẾU</label>
              <span>{date}</span>
            </div>
            <div className="detail-item">
              <label>GIỜ CHIẾU</label>
              <span>{time}</span>
            </div>
            <div className="detail-item highlight-pink">
              <label>SỐ GHẾ</label>
              <span>{ticket.seat_number}</span>
            </div>
            <div className="detail-item highlight-pink">
              <label>TỔNG TIỀN</label>
              <span>{Number(ticket.ticket_price).toLocaleString()}₫</span>
            </div>
            <div className="detail-item full-width">
               <label>COMBO BẮP NƯỚC</label>
               <span>{ticket.combos || "Không có"}</span>
            </div>
          </div>

          <div className="dashed-line"></div>

          {/* --- PHẦN QR CODE CÓ TRẠNG THÁI --- */}
          <div className="ticket-barcode" style={{ position: 'relative' }}>
            
            {/* Nếu vé đã dùng hoặc hết hạn, làm mờ QR đi */}
            <div style={{ opacity: (isCheckedIn || isExpired) ? 0.3 : 1 }}>
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${ticket.id}`} 
                    alt="QR Code"
                    className="qr-code-img"
                />
                <span className="ticket-id">MÃ VÉ: #{ticket.id}</span>
            </div>

            {/* Hiển thị con dấu đè lên */}
            {isCheckedIn && (
                <div className="stamp-overlay used">ĐÃ SỬ DỤNG</div>
            )}
            {isExpired && (
                <div className="stamp-overlay expired">HẾT HẠN</div>
            )}

            <p className="thank-you">
                {isCheckedIn ? "Vé này đã được check-in." : 
                 isExpired ? "Suất chiếu đã kết thúc." : 
                 "Đưa mã này cho nhân viên để vào rạp"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieTicket;