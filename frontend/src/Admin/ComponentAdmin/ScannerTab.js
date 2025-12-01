import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { FaCheckCircle, FaTimesCircle, FaCamera, FaRedo, FaExclamationTriangle } from 'react-icons/fa';
import "../AdminCSS/AdminShared.css"; 

const ScannerTab = ({ api }) => {
  const [ticketData, setTicketData] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(true);
  const [cameraError, setCameraError] = useState(null); // State lưu lỗi camera

  // Xử lý khi quét thành công
  const handleScan = (result) => {
    if (result) {
      const rawValue = result[0]?.rawValue;
      if (rawValue) {
          setScanEnabled(false); 
          verifyTicket(rawValue);
      }
    }
  };

  // Xử lý lỗi Camera (Quan trọng để biết tại sao ko hiện)
  const handleError = (error) => {
    console.error("Camera Error:", error);
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setCameraError("Bạn đã chặn quyền truy cập Camera. Vui lòng cho phép trong cài đặt trình duyệt.");
    } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        setCameraError("Không tìm thấy thiết bị Camera trên máy này.");
    } else {
        setCameraError("Lỗi Camera: " + error?.message);
    }
  };

  // API kiểm tra vé
  const verifyTicket = async (code) => {
    setLoading(true);
    try {
      const ticketId = code.replace(/\D/g, ''); 
      const res = await api.post("/admin/verify-ticket", { ticketId });
      setTicketData({ valid: true, ...res.data });
    } catch (err) {
      setTicketData({ 
        valid: false, 
        message: err.response?.data?.message || "Lỗi kiểm tra vé",
        ticket: err.response?.data?.ticket 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicketData(null);
    setScanEnabled(true);
    setCameraError(null);
  };

  return (
    <div className="tab-content d-flex flex-column align-items-center">
      <h2 className="page-title w-100">Soát Vé (Check-in)</h2>

      <div className="scanner-container" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        {!ticketData ? (
          <>
            {/* Khung Camera */}
            <div className="camera-wrapper rounded overflow-hidden shadow-lg border-pink bg-dark" style={{height: '350px', position: 'relative', backgroundColor: '#000'}}>
                
                {/* Hiển thị lỗi nếu có */}
                {cameraError ? (
                    <div className="h-100 d-flex flex-column justify-content-center align-items-center text-white p-4 text-center">
                        <FaExclamationTriangle size={40} className="text-warning mb-3" />
                        <p>{cameraError}</p>
                        <button className="btn btn-sm btn-light mt-2" onClick={() => window.location.reload()}>Thử lại</button>
                    </div>
                ) : (
                    /* Component Scanner */
                    scanEnabled && (
                        <Scanner
                            onScan={handleScan}
                            onError={handleError}
                            allowMultiple={true}
                            scanDelay={2000}
                            components={{
                                audio: false,
                                finder: false, // Tắt finder mặc định để dùng overlay custom đẹp hơn
                            }}
                            constraints={{
                                facingMode: 'environment' // Ưu tiên cam sau, nếu lỗi nó sẽ tự fallback
                            }}
                            styles={{
                                container: { width: '100%', height: '100%' },
                                video: { width: '100%', height: '100%', objectFit: 'cover' }
                            }}
                        />
                    )
                )}
                
                {/* Đường kẻ laser giả lập (Chỉ hiện khi không lỗi) */}
                {!cameraError && (
                    <div className="scanner-overlay">
                        <div className="scan-line"></div>
                    </div>
                )}
            </div>

            <p className="text-center mt-3 text-muted">
                <FaCamera className="me-2" /> Đưa mã QR của khách vào khung hình
            </p>
            {loading && <p className="text-pink fw-bold text-center">Đang kiểm tra vé...</p>}
          </>
        ) : (
          // --- KẾT QUẢ SOÁT VÉ ---
          <div className={`ticket-result-card p-4 rounded shadow text-center animate-pop ${ticketData.valid ? 'bg-success-light' : 'bg-danger-light'}`}>
            
            {ticketData.valid ? (
                <FaCheckCircle size={60} className="text-success mb-3" />
            ) : (
                <FaTimesCircle size={60} className="text-danger mb-3" />
            )}

            <h3 className={ticketData.valid ? "text-success" : "text-danger"}>
                {ticketData.valid ? "VÉ HỢP LỆ" : "KHÔNG HỢP LỆ"}
            </h3>
            <p className="fw-bold">{ticketData.message}</p>

            {ticketData.ticket && (
                <div className="ticket-info bg-white p-3 rounded text-start mt-3 shadow-sm">
                    <p><strong>Phim:</strong> {ticketData.ticket.movie_title}</p>
                    <p><strong>Rạp:</strong> {ticketData.ticket.theater_name}</p>
                    <p><strong>Ghế:</strong> <span className="seat-badge">{ticketData.ticket.seat_number}</span></p>
                    <p><strong>Suất:</strong> {ticketData.ticket.show_time} - {new Date(ticketData.ticket.show_date).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Khách:</strong> {ticketData.ticket.user_name}</p>
                    <p><strong>ID Vé:</strong> <span className="text-danger">#{ticketData.ticket.id}</span></p>
                </div>
            )}

            <button className="btn-add mt-4 w-100" onClick={handleReset}>
                <FaRedo /> Quét vé tiếp theo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerTab;