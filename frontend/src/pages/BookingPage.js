import React, { useEffect, useState, useMemo, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createApi } from "../utils/api";
import { AuthContext } from "../Context/AuthContext";
import ModalThanhToan from "../components/ModalPayment"; 
import { FaClock, FaMapMarkerAlt, FaFilm, FaTicketAlt, FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import "../css/BookingPage.css";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const showtimeId = searchParams.get("showtimeId");
  const { user, accessToken, refreshToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const api = useMemo(() => {
    return createApi(
      () => localStorage.getItem("accessToken"), 
      () => localStorage.getItem("refreshToken"),
      () => {
        logout();
        navigate("/login");
      }
    );
  }, [logout, navigate]);

  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedCombos, setSelectedCombos] = useState({}); 
  const [combos, setCombos] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoStatus, setPromoStatus] = useState("");
  const [hasSynced, setHasSynced] = useState(false);

  // --- FETCH DATA ---
  const fetchShowtime = async () => {
    try {
      const res = await api.get(`/showtimes/${showtimeId}?t=${Date.now()}`);
      const data = res.data;
      setShowtime(data); 

      if (!hasSynced && user && data.seats) {
          const myHeldSeats = [];
          let maxExpireTime = 0;

          data.seats.forEach(seat => {
              if (seat.hold_user_id && seat.hold_user_id == user.id) {
                  const expireTime = new Date(seat.expired_at || seat.hold_expires).getTime();
                  if (expireTime > Date.now()) {
                      myHeldSeats.push(seat.id);
                      if (expireTime > maxExpireTime) maxExpireTime = expireTime;
                  }
              }
          });

          if (myHeldSeats.length > 0) {
              setSelectedSeats(myHeldSeats);
              const secondsLeft = Math.floor((maxExpireTime - Date.now()) / 1000);
              setTimeLeft(secondsLeft > 0 ? secondsLeft : 300);
          }
          setHasSynced(true);
      }

    } catch (err) {
      console.error("Lỗi tải suất chiếu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      if (!showtimeId) return;
      setLoading(true);
      fetchShowtime();
      const interval = setInterval(fetchShowtime, 5000);
      return () => clearInterval(interval);
  }, [showtimeId, api]); 

  useEffect(() => {
    api.get("/combos").then(res => setCombos(res.data));
  }, [api]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- LOGIC XỬ LÝ GHẾ ---
  const seats = useMemo(() => {
    if (!showtime) return [];
    
    // 1. Lọc trùng ghế
    const uniqueSeatsMap = new Map();
    if (showtime.seats) {
        showtime.seats.forEach(s => { if (!uniqueSeatsMap.has(s.id)) uniqueSeatsMap.set(s.id, s); });
    }
    const totalSeats = Array.from(uniqueSeatsMap.values());

    // 2. Xác định tổng số hàng (dựa vào chữ cái A, B, C...)
    const rowsSet = new Set();
    totalSeats.forEach(s => rowsSet.add(s.seat_number.charAt(0)));
    const totalRows = rowsSet.size;
    const sortedRows = Array.from(rowsSet).sort(); // ['A', 'B', 'C'...]

    return totalSeats.map((seatData) => {
      // Tìm chỉ số hàng (A=0, B=1...) để áp dụng logic fix cứng
      const rowChar = seatData.seat_number.charAt(0);
      const rowIndex = sortedRows.indexOf(rowChar);
      
      // Lấy số ghế (1, 2, 3...)
      const seatNum = parseInt(seatData.seat_number.replace(/^\D+/g, ''));

      let typeClass = "normal";
      
      // Logic Fix cứng: Hàng cuối là Couple
      if (rowIndex === totalRows - 1) {
        typeClass = "couple";
      } else {
        // Logic VIP: Các hàng giữa (trừ 2 hàng đầu và hàng cuối)
        // Và trừ các ghế sát lề (giả sử mỗi hàng > 4 ghế)
        if (rowIndex >= 2 && rowIndex < totalRows - 1) {
             typeClass = "vip"; 
        }
      }

      const multiplier = typeClass === "vip" ? 1.2 : typeClass === "couple" ? 2.0 : 1.0; 
      const basePrice = showtime.base_price || 50000;
      const price = Math.round(basePrice * multiplier);

      // Trạng thái
      const isSold = !!seatData.isBooked || seatData.status === 1 || seatData.is_sold === 1;
      let isHeldByMe = false;
      let isHeldByOther = false;

      if (seatData.hold_user_id) {
         if (user && seatData.hold_user_id == user.id) {
             isHeldByMe = true;
         } else {
             isHeldByOther = true;
         }
      }

      return {
        ...seatData,
        isBooked: isSold || isHeldByOther,
        isHeldByMe,
        typeLabel: typeClass === "vip" ? "Ghế VIP" : typeClass === "couple" ? "Ghế Đôi" : "Ghế Thường",
        typeClass,
        price
      };
    });
  }, [showtime, user]);

  // --- GOM NHÓM THEO HÀNG  ---
  const seatRows = useMemo(() => {
    const rows = {};
    seats.forEach(seat => {
        const rowLabel = seat.seat_number.charAt(0);
        if (!rows[rowLabel]) rows[rowLabel] = [];
        rows[rowLabel].push(seat);
    });
    // Sắp xếp A->Z
    return Object.keys(rows).sort().map(rowLabel => {
        return {
            label: rowLabel,
            // Sắp xếp 1->10
            seats: rows[rowLabel].sort((a, b) => {
                const numA = parseInt(a.seat_number.replace(/^\D+/g, '')) || 0;
                const numB = parseInt(b.seat_number.replace(/^\D+/g, '')) || 0;
                return numA - numB;
            })
        };
    });
  }, [seats]);

  // --- TOGGLE SEAT ---
  const toggleSeat = async (seat) => {
    if (seat.isBooked) return;

    let idsToToggle = [];
    if (seat.typeClass !== "couple") {
      idsToToggle = [seat.id];
    } else {
      // Logic chọn ghế đôi
      const seatNum = parseInt(seat.seat_number.replace(/^\D+/g, ''));
      if (Number.isNaN(seatNum)) return;
      
      const pairNum = seatNum % 2 !== 0 ? seatNum + 1 : seatNum - 1;
      const rowChar = seat.seat_number.charAt(0);
      
      const pairSeat = seats.find(s => s.seat_number === `${rowChar}${pairNum}`);
      if (!pairSeat || pairSeat.isBooked) {
          alert("Ghế đôi này không thể chọn lẻ hoặc ghế bên cạnh đã được đặt!");
          return;
      }
      idsToToggle = [seat.id, pairSeat.id];
    }

    const isDeselecting = idsToToggle.every(id => selectedSeats.includes(id));

    if (isDeselecting) {
        // BỎ CHỌN -> GỌI API RELEASE
        setSelectedSeats(prev => prev.filter(id => !idsToToggle.includes(id)));

        const seatsToRelease = idsToToggle.filter(id => {
            const s = seats.find(item => item.id === id);
            return s && s.isHeldByMe; 
        });

        if (seatsToRelease.length > 0) {
            try {
                await api.post("/booking/release", {
                    showtime_id: showtimeId,
                    seats: seatsToRelease
                });
                fetchShowtime(); // Cập nhật lại ngay
            } catch (err) {
                console.error("Lỗi hủy giữ ghế:", err);
            }
        }
    } else {
        // CHỌN MỚI
        setSelectedSeats(prev => Array.from(new Set([...prev, ...idsToToggle])));
    }
  };

  const toggleCombo = comboId => {
    setSelectedCombos(prev => {
      const newState = { ...prev };
      newState[comboId] = (newState[comboId] || 0) + 1;
      return newState;
    });
  };

  const removeCombo = comboId => {
    setSelectedCombos(prev => {
      const newState = { ...prev };
      if (newState[comboId] > 1) newState[comboId]--;
      else delete newState[comboId];
      return newState;
    });
  };

  const selectedSeatDetails = selectedSeats.map(id => seats.find(s => s.id === id)).filter(Boolean);
  const comboDetails = Object.entries(selectedCombos).map(([comboId, qty]) => {
    const combo = combos.find(c => c.id === parseInt(comboId));
    if (!combo) return null;
    return { ...combo, quantity: qty, total: combo.price * qty };
  }).filter(Boolean);

  const tempPrice = selectedSeatDetails.reduce((sum, s) => sum + (s.price || 0), 0) + comboDetails.reduce((sum, c) => sum + c.total, 0);
  const discountAmount = appliedPromo ? (tempPrice * appliedPromo.discount_percent) / 100 : 0;
  const finalPrice = tempPrice - discountAmount;

  const handleApplyCode = async () => {
    if (!promoCode.trim()) return;
    setPromoMessage("Đang kiểm tra...");
    setPromoStatus(""); 
    setAppliedPromo(null);
    try {
        const res = await api.post("/promotions/verify", {
            code: promoCode,
            total_amount: tempPrice,
            user_id: user?.id,               
            seat_count: selectedSeats.length 
        });
        if (res.data.valid) {
            setAppliedPromo({
                id: res.data.promotion_id,
                discount_percent: res.data.discount_percent,
                code: promoCode
            });
            setPromoMessage(`${res.data.message}`);
            setPromoStatus("success"); 
        }
    } catch (err) {
        setAppliedPromo(null);
        const errorMsg = err.response?.data?.message || "Mã không hợp lệ!";
        setPromoMessage(errorMsg);
        setPromoStatus("error"); 
    }
  };

  // --- LOGIC GIỮ GHẾ ---
  const handleHoldSeatsAndPay = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để tiếp tục!");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Lọc ra những ghế CHƯA được giữ bởi tôi
      const seatsToHold = selectedSeats.filter(seatId => {
          const seatObj = seats.find(s => s.id === seatId);
          // Chỉ gọi API cho ghế nào chưa có cờ isHeldByMe
          return seatObj && !seatObj.isHeldByMe;
      });

      // 2. Nếu có ghế mới cần giữ thì mới gọi API
      if (seatsToHold.length > 0) {
          const res = await api.post("/booking/hold", {
              showtime_id: showtimeId,
              seats: seatsToHold
          });

          if (res.data.expire_at) {
              const expireTime = new Date(res.data.expire_at).getTime();
              const secondsLeft = Math.floor((expireTime - Date.now()) / 1000);
              setTimeLeft(secondsLeft > 0 ? secondsLeft : 300);
          }
          
          // Cập nhật lại dữ liệu để isHeldByMe = true cho các ghế vừa giữ
          await fetchShowtime(); 
      }

      // 3. Mở Modal (Dù có gọi API hay không)
      setShowModal(true);

    } catch (err) {
      if (err.response && (err.response.status === 409 || err.response.status === 400)) {
          alert(err.response.data.message || "Ghế bạn chọn vừa bị người khác đặt.");
          fetchShowtime(); 
          setSelectedSeats([]); 
      } else {
          alert("Lỗi hệ thống: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = sec => `${Math.floor(sec/60)}:${String(sec % 60).padStart(2,'0')}`;

  if (loading && !showtime) return <div className="d-flex flex-column align-items-center justify-content-center vh-100"><FaSpinner className="fa-spin fs-1 text-pink mb-3"/><p>Đang tải dữ liệu...</p></div>;
  if (!showtime) return <div className="text-center p-5">Không tìm thấy suất chiếu</div>;

  return (
    <div className="container my-4">
      <div className="text-center mb-4 position-relative">
        <button 
            className="btn btn-link text-decoration-none text-dark fw-bold position-absolute start-0 top-0" 
            onClick={() => navigate(-1)}
        >
            <FaArrowLeft className="me-2"/> Quay lại
        </button>
        
        <h2 className="fw-bold text-pink"><FaFilm className="me-2"/> {showtime?.movie_title}</h2>
        <p className="fw-bold fs-5 text-muted"><FaMapMarkerAlt className="me-2"/> {showtime?.theater_name}</p>
        <p>
           Suất chiếu: <strong>{showtime?.show_time?.toString().slice(0,5)}</strong> - <strong>{showtime?.show_date ? new Date(showtime.show_date).toLocaleDateString('vi-VN') : ""}</strong>
        </p>
        <h5 className="text-danger mt-3 d-flex align-items-center justify-content-center"><FaClock className="me-2"/> Thời gian giữ ghế: {formatTime(timeLeft)}</h5>
      </div>

      <div className="row">
        <div className="col-md-8 mb-4">
          <div className="screen text-center mb-3">MÀN HÌNH</div>
          
          <div className="seat-map-container d-flex flex-column align-items-center">
            {seatRows.map((row) => (
              <div key={row.label} className="d-flex align-items-center mb-2 w-100 justify-content-center">
                <div className="fw-bold me-3 text-muted text-center" style={{width: '20px'}}>{row.label}</div>
                
                <div className="d-flex justify-content-center gap-1 flex-wrap">
                    {row.seats.map(seat => (
                    <button
                        key={seat.id}
                        className={`btn seat ${seat.typeClass} 
                           ${selectedSeats.includes(seat.id) ? "selected" : ""} 
                           ${seat.isBooked ? "booked" : ""} 
                           ${seat.isHeldByMe ? "selected" : ""}  
                        `}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.isBooked}
                        title={`${seat.seat_number} (${seat.typeLabel}) - ${seat.price.toLocaleString()}đ`}
                    >
                        {seat.seat_number.replace(/^\D+/g, '')}
                    </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 d-flex justify-content-center gap-4 seat-legend flex-wrap">
            <div><span className="seat normal"></span> Thường</div>
            <div><span className="seat vip"></span> VIP</div>
            <div><span className="seat couple"></span> Đôi</div>
            <div><span className="seat booked"></span> Đã bán/Giữ</div>
            <div><span className="seat selected"></span> Đang chọn</div>
          </div>

          {/* Phần Combo */}
          <div className="mt-4">
            <h5 className="mb-3 text-pink fw-bold">Chọn Combo Bắp Nước</h5>
            {combos.map(combo => (
              <div key={combo.id} className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                <div className="d-flex align-items-center">
                   <div style={{width: '70px', height: '70px', flexShrink: 0, marginRight: '15px'}}>
                       <img src={combo.image} alt={combo.name} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} onError={(e) => e.target.src="https://via.placeholder.com/70x70?text=Combo"}/>
                   </div>
                   <div>
                      <strong className="d-block">{combo.name}</strong> 
                      <span className="text-danger fw-bold">{Number(combo.price).toLocaleString()}đ</span>
                      <p className="mb-0 text-muted small">{combo.description}</p>
                   </div>
                </div>
                <div className="d-flex align-items-center">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => removeCombo(combo.id)} style={{width: '30px'}}>-</button>
                  <span className="fw-bold text-center" style={{minWidth: '20px'}}>{selectedCombos[combo.id] || 0}</span>
                  <button className="btn btn-sm btn-outline-primary ms-2" onClick={() => toggleCombo(combo.id)} style={{width: '30px'}}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow border-0">
            <div className="card-body">
              <h5 className="card-title fw-bold text-pink mb-3">Thông tin đặt vé</h5>
              <div className="mb-3">
                  <h6>Ghế đã chọn:</h6>
                  {selectedSeatDetails.length === 0 ? <p className="text-muted small">Chưa chọn ghế</p> : 
                    <ul className="list-unstyled text-dark small">
                      {selectedSeatDetails.map(s => <li key={s.id} className="d-flex justify-content-between"><span>{s.seat_number} ({s.typeLabel})</span><span>{s.price.toLocaleString()}đ</span></li>)}
                    </ul>
                  }
              </div>
              <div className="mb-3">
                  <h6>Combo:</h6>
                  {comboDetails.length === 0 ? <p className="text-muted small">Chưa chọn combo</p> : 
                    <ul className="list-unstyled text-dark small">
                      {comboDetails.map(c => <li key={c.id} className="d-flex justify-content-between"><span>{c.name} x {c.quantity}</span><span>{c.total.toLocaleString()}đ</span></li>)}
                    </ul>
                  }
              </div>
              <hr />
              <div className="mb-3">
                  <label className="form-label fw-bold text-muted small"><FaTicketAlt className="me-1"/> Mã khuyến mãi / Voucher</label>
                  <div className="input-group">
                      <input type="text" className="form-control" placeholder="Nhập mã giảm giá" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} disabled={!!appliedPromo} />
                      {appliedPromo ? (
                          <button className="btn btn-danger" onClick={() => { setAppliedPromo(null); setPromoCode(""); setPromoMessage(""); setPromoStatus(""); }}>Hủy</button>
                      ) : (
                          <button className="btn btn-dark" onClick={handleApplyCode}>Áp dụng</button>
                      )}
                  </div>
                  {promoMessage && <small className={`d-flex align-items-center mt-1 fw-bold ${promoStatus === 'success' ? 'text-success' : 'text-danger'}`}>{promoStatus === 'success' ? <FaCheckCircle className="me-1"/> : <FaExclamationCircle className="me-1"/>}{promoMessage}</small>}
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-1 text-muted"><span>Tạm tính:</span><span>{tempPrice.toLocaleString()}đ</span></div>
              {appliedPromo && <div className="d-flex justify-content-between mb-1 text-success"><span>Giảm giá ({appliedPromo.discount_percent}%):</span><span>-{discountAmount.toLocaleString()}đ</span></div>}
              <div className="d-flex justify-content-between fw-bold fs-5 text-pink mt-2"><span>Tổng cộng:</span><span>{finalPrice.toLocaleString()}đ</span></div>
              
              <button className="btn btn-danger w-100 mt-3 py-2 fw-bold" onClick={handleHoldSeatsAndPay} disabled={selectedSeats.length === 0 || loading}>
                {loading ? "Đang kiểm tra..." : "TIẾP TỤC THANH TOÁN"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ModalThanhToan
          selectedSeats={selectedSeatDetails}
          comboDetails={comboDetails}
          totalPrice={finalPrice}
          onClose={() => setShowModal(false)}
          userId={user?.id} 
          showtimeId={showtimeId}
          promotionId={appliedPromo?.id}
          api={api} 
        />
      )}
    </div>
  );
}