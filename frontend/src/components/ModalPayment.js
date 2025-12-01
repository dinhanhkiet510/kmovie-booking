import React, { useState, useEffect } from "react";
import "../css/BookingPage.css";

// === 1. CẤU HÌNH TÀI KHOẢN NHẬN TIỀN ===
const MY_BANK = {
  BANK_ID: "TPB",
  ACCOUNT_NO: "0973154127", 
  ACCOUNT_NAME: "DINH ANH KIET", 
  TEMPLATE: "compact" 
};

export default function ModalThanhToan({ 
  selectedSeats, 
  comboDetails, 
  totalPrice, 
  onClose, 
  showtimeId, 
  userId,
  promotionId, 
  api // NHẬN API INSTANCE TỪ CHA (BookingPage)
}) {
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [qrUrl, setQrUrl] = useState(""); 
  const [orderInfo, setOrderInfo] = useState(null); 
  const [isPaid, setIsPaid] = useState(false); 

  // === 2. LOGIC TỰ ĐỘNG CHECK TRẠNG THÁI ===
  useEffect(() => {
    let intervalId;

    if (step === 2 && orderInfo && !isPaid) {
      const checkStatus = async () => {
        try {

          const res = await api.get(`/bookings/${orderInfo.id}?_t=${Date.now()}`);
          
          const data = res.data;

          const status = data?.status ? String(data.status).toUpperCase() : "";

          if (status === "PAID" || status === "SUCCESS") {
            console.log("THANH TOÁN THÀNH CÔNG!");
            
            if (intervalId) clearInterval(intervalId);
            setIsPaid(true);

            alert("Thanh toán thành công! Vé đã được xuất.");
            onClose(); 
            window.location.href = "/user/profile"; 
          }
        } catch (error) {
          console.error("Lỗi check status:", error);
        }
      };

      checkStatus();
      intervalId = setInterval(checkStatus, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, orderInfo, isPaid, onClose, api]);

  // === 3. HÀM XỬ LÝ TẠO ĐƠN & HIỆN QR ===
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
      const bookingData = {
        user_id: userId,
        showtime_id: showtimeId,
        seats: selectedSeats.map(s => ({ id: s.id, price: s.price })),
        combos: comboDetails.map(c => ({ id: c.id, quantity: c.quantity, price: c.price })),
        total_price: totalPrice,
        promotion_id: promotionId,
        payment_method: "BANK_TRANSFER" 
      };

      // DÙNG API INSTANCE (Tự động gắn token)
      const bookingRes = await api.post("/bookings", bookingData);

      const bookingResult = bookingRes.data;
      const orderId = bookingResult.bookingId || bookingResult.id; 

      setOrderInfo({ id: orderId, price: totalPrice });

      const transferContent = `THANHTOAN ${orderId}`;
      const qrImage = `https://img.vietqr.io/image/${MY_BANK.BANK_ID}-${MY_BANK.ACCOUNT_NO}-${MY_BANK.TEMPLATE}.png?amount=${totalPrice}&addInfo=${transferContent}&accountName=${encodeURIComponent(MY_BANK.ACCOUNT_NAME)}`;

      setQrUrl(qrImage);
      setStep(2); 

    } catch (error) {
        console.error(error);
        // Lấy thông báo lỗi từ axios response
        const message = error.response?.data?.message || error.message || "Lỗi khi tạo đơn hàng.";
        alert("Lỗi: " + message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content-payment" style={{ maxWidth: step === 2 ? '500px' : '600px' }}>
        
        {step === 1 && (
          <>
            <h5 className="mb-3">Xác nhận thanh toán</h5>
            
            <div className="bg-light p-3 rounded mb-3">
              <h6>Ghế đã chọn:</h6>
              {selectedSeats.length === 0 ? (
                <p className="text-muted">Chưa chọn ghế nào</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {selectedSeats.map((s) => (
                    <li key={s.id}>
                      {s.seat_number} - {s.price.toLocaleString()}đ <small>({s.typeLabel})</small>
                    </li>
                  ))}
                </ul>
              )}

              {comboDetails.length > 0 && (
                <>
                  <hr />
                  <h6>Combo:</h6>
                  <ul className="list-unstyled mb-0">
                    {comboDetails.map((c) => (
                      <li key={c.id}>
                        {c.name} x {c.quantity} - {c.total.toLocaleString()}đ
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <span className="fw-bold">Tổng tiền:</span>
                <span className="fw-bold fs-4 text-danger">{totalPrice.toLocaleString()}đ</span>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Đóng
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? "Đang tạo mã QR..." : "Xác nhận & Thanh toán"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="text-center">
            <h5 className="mb-2 text-primary">Quét mã QR để thanh toán</h5>
            
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3 p-2 bg-warning bg-opacity-10 rounded">
                 <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
                 <span className="text-dark small fw-bold">Đang chờ tiền về tài khoản...</span>
            </div>

            <div className="border p-2 rounded d-inline-block mb-3">
              <img src={qrUrl} alt="QR Code" style={{ width: '100%', maxWidth: '300px' }} />
            </div>

            <div className="alert alert-info small text-start">
               <strong>Hướng dẫn:</strong><br/>
                <p>1. Mở App Ngân hàng - Chọn Quét QR. </p><br/>
                <p>2. Quét mã trên - Nội dung và số tiền sẽ tự động điền.</p><br/>
                <p>3. Bấm chuyển khoản và đợi vài giây, hệ thống sẽ tự xác nhận.</p>
            </div>
            
            <button className="btn btn-link text-secondary mt-2 btn-sm" onClick={onClose}>
              Để sau / Hủy bỏ
            </button>
          </div>
        )}

      </div>
    </div>
  );
}