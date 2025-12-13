import React, { useState, useEffect } from "react";
import "../css/BookingPage.css"; // Đảm bảo bạn có file css này
import { FaGem, FaSpinner, FaCheckCircle } from "react-icons/fa";

// === CẤU HÌNH TÀI KHOẢN NHẬN TIỀN (VietQR) ===
const MY_BANK = {
  BANK_ID: "TPB",           // Mã ngân hàng (VD: MB, VCB, TPB, ACB...)
  ACCOUNT_NO: "0973154127", // Số tài khoản của bạn
  ACCOUNT_NAME: "DINH ANH KIET", // Tên chủ tài khoản
  TEMPLATE: "compact"       // Giao diện QR (compact, print, qr_only)
};

export default function ModalThanhToan({ 
  selectedSeats, 
  comboDetails, 
  totalPrice,      // Giá hiển thị (đã trừ điểm)
  onClose, 
  showtimeId, 
  userId,
  promotionId, 
  usePoints,       // Prop: Có dùng điểm không
  pointsDiscount,  // Prop: Số tiền giảm từ điểm 
  api 
}) {
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Xác nhận, Step 2: Quét QR
  const [qrUrl, setQrUrl] = useState(""); 
  const [orderInfo, setOrderInfo] = useState(null); 
  const [isPaid, setIsPaid] = useState(false); 

  // === 1. LOGIC TỰ ĐỘNG CHECK TRẠNG THÁI (POLLING) ===
  // Chạy mỗi 2 giây khi ở Step 2
  useEffect(() => {
    let intervalId;

    if (step === 2 && orderInfo && !isPaid) {
      const checkStatus = async () => {
        try {
          // Gọi API lấy trạng thái đơn hàng hiện tại
          const res = await api.get(`/bookings/${orderInfo.id}?_t=${Date.now()}`);
          const data = res.data;
          const status = data?.status ? String(data.status).toUpperCase() : "";

          // Nếu trạng thái là PAID -> Thành công
          if (status === "PAID" || status === "SUCCESS") {
            clearInterval(intervalId);
            setIsPaid(true);
            
            // --- THÔNG BÁO QUAN TRỌNG ---
            alert("THANH TOÁN THÀNH CÔNG!\n\nVé điện tử đã được gửi về Email của bạn.\nVui lòng kiểm tra hộp thư (kể cả mục Spam).");
            
            onClose(); // Đóng modal
            window.location.href = "/user/profile"; // Chuyển hướng về trang cá nhân
          }
        } catch (error) {
          console.error("Lỗi check status:", error);
        }
      };

      checkStatus(); // Check ngay lập tức
      intervalId = setInterval(checkStatus, 2000); // Sau đó lặp lại mỗi 2s
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, orderInfo, isPaid, onClose, api]);


  // === 2. HÀM XỬ LÝ TẠO ĐƠN & THANH TOÁN ===
  const handlePayment = async () => {
    if (!userId) {
      alert("Vui lòng đăng nhập để thanh toán!");
      return;
    }
    if (selectedSeats.length === 0) {
      alert("Vui lòng chọn ghế!");
      return;
    }

    setLoading(true);

    try {
      // Chuẩn bị dữ liệu gửi lên Server
      const bookingData = {
        user_id: userId,
        showtime_id: showtimeId,
        seats: selectedSeats.map(s => ({ id: s.id, price: s.price })),
        combos: comboDetails.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, price: c.price })),
        total_price: totalPrice,
        promotion_id: promotionId,
        use_points: usePoints, // Gửi trạng thái dùng điểm
        payment_method: "BANK_TRANSFER" 
      };

      // Gọi API tạo đơn hàng
      const bookingRes = await api.post("/bookings", bookingData);
      const bookingResult = bookingRes.data;
      
      const finalAmountFromServer = bookingResult.finalTotal; 
      const orderId = bookingResult.bookingId || bookingResult.id; 

      // --- TRƯỜNG HỢP 1: Dùng điểm trả hết 100% (0đ) ---
      if (finalAmountFromServer <= 0) {
          alert("ĐỔI ĐIỂM THÀNH CÔNG!\n\nVé điện tử đã được gửi về Email của bạn.\nVui lòng kiểm tra hộp thư.");
          onClose();
          window.location.href = "/user/profile";
          return;
      }

      // --- TRƯỜNG HỢP 2: Vẫn còn tiền phải trả -> Tạo QR Ngân hàng ---
      setOrderInfo({ id: orderId, price: finalAmountFromServer });

      // Nội dung chuyển khoản: THANHTOAN + Mã đơn hàng
      const transferContent = `THANHTOAN ${orderId}`;
      
      // Tạo link QR VietQR
      const qrImage = `https://img.vietqr.io/image/${MY_BANK.BANK_ID}-${MY_BANK.ACCOUNT_NO}-${MY_BANK.TEMPLATE}.png?amount=${finalAmountFromServer}&addInfo=${transferContent}&accountName=${encodeURIComponent(MY_BANK.ACCOUNT_NAME)}`;

      setQrUrl(qrImage);
      setStep(2); // Chuyển sang màn hình quét QR

    } catch (error) {
        console.error(error);
        const message = error.response?.data?.message || error.message || "Lỗi khi tạo đơn hàng.";
        alert("Lỗi: " + message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050
    }}>
      <div className="bg-white rounded shadow p-4" style={{ width: '100%', maxWidth: step === 2 ? '500px' : '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* === STEP 1: XÁC NHẬN THÔNG TIN === */}
        {step === 1 && (
          <>
            <h5 className="mb-3 fw-bold text-center border-bottom pb-2">XÁC NHẬN THANH TOÁN</h5>
            
            <div className="bg-light p-3 rounded mb-3">
              <h6 className="fw-bold">Ghế đã chọn:</h6>
              <ul className="list-unstyled mb-2 ps-3">
                  {selectedSeats.map((s) => (
                    <li key={s.id} className="d-flex justify-content-between">
                      <span>Ghế <strong>{s.seat_number}</strong> ({s.typeLabel})</span>
                      <span>{s.price.toLocaleString()}đ</span>
                    </li>
                  ))}
              </ul>

              {comboDetails.length > 0 && (
                <>
                  <hr />
                  <h6 className="fw-bold">Combo bắp nước:</h6>
                  <ul className="list-unstyled mb-2 ps-3">
                    {comboDetails.map((c) => (
                      <li key={c.id} className="d-flex justify-content-between">
                        <span>{c.name} (x{c.quantity})</span>
                        <span>{c.total.toLocaleString()}đ</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Hiển thị giảm giá từ điểm */}
              {usePoints && pointsDiscount > 0 && (
                  <div className="mt-3 pt-2 border-top border-secondary border-dashed text-success fw-bold d-flex justify-content-between">
                      <span><FaGem className="me-1"/> Dùng điểm tích lũy:</span>
                      <span>-{pointsDiscount.toLocaleString()}đ</span>
                  </div>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-white border rounded">
                <span className="fw-bold fs-5">Tổng thanh toán:</span>
                <span className="fw-bold fs-3 text-danger">{totalPrice.toLocaleString()}đ</span>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
                Đóng
              </button>
              <button 
                className="btn btn-danger px-4 fw-bold" 
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? <><FaSpinner className="fa-spin me-2"/>Đang xử lý...</> : (totalPrice > 0 ? "Xác nhận & Tạo QR" : "Xác nhận Đổi vé")}
              </button>
            </div>
          </>
        )}

        {/* === STEP 2: QUÉT MÃ QR === */}
        {step === 2 && (
          <div className="text-center">
            <h5 className="mb-2 text-primary fw-bold">THANH TOÁN QUA NGÂN HÀNG</h5>
            <p className="text-muted small">Vui lòng quét mã QR bên dưới để hoàn tất đặt vé</p>
            
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3 p-2 bg-warning bg-opacity-10 rounded border border-warning text-warning-emphasis">
                 <div className="spinner-border spinner-border-sm" role="status"></div>
                 <span className="small fw-bold">Hệ thống đang chờ tiền về tài khoản...</span>
            </div>

            <div className="border p-2 rounded d-inline-block mb-3 shadow-sm bg-white">
              <img src={qrUrl} alt="QR Code Thanh Toán" style={{ width: '100%', maxWidth: '300px', display: 'block' }} />
            </div>

            <div className="alert alert-info small text-start mx-auto" style={{maxWidth: '400px'}}>
               <strong><FaCheckCircle className="me-1"/>Hướng dẫn:</strong>
               <ul className="mb-0 ps-3">
                 <li>Mở App Ngân hàng trên điện thoại.</li>
                 <li>Chọn tính năng <strong>Quét QR (QR Pay)</strong>.</li>
                 <li>Nội dung và số tiền đã được điền tự động. Bấm <strong>Chuyển khoản</strong>.</li>
                 <li>Đợi vài giây, màn hình sẽ tự động chuyển trang.</li>
               </ul>
            </div>
            
            <button className="btn btn-link text-secondary mt-2 btn-sm text-decoration-none" onClick={onClose}>
              Hủy bỏ / Để sau
            </button>
          </div>
        )}

      </div>
    </div>
  );
}