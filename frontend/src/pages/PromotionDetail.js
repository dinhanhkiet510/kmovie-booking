import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaGift, FaCopy, FaCheck } from "react-icons/fa";

const PromotionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false); // State hiệu ứng copy

  useEffect(() => {
    const fetchPromoDetail = async () => {
      try {
        // API này trả về chi tiết khuyến mãi (bao gồm cả code)
        const res = await fetch(`http://localhost:5000/api/promotions/${id}`); 
        if (res.ok) {
            const data = await res.json();
            setPromo(Array.isArray(data) ? data[0] : data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPromoDetail();
  }, [id]);

  // Hàm copy mã vào clipboard
  const handleCopyCode = () => {
      if (promo?.code) {
          navigator.clipboard.writeText(promo.code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Reset sau 2s
      }
  };

  if (loading) return <div className="text-center py-5">Đang tải ưu đãi...</div>;
  if (!promo) return <div className="text-center py-5">Không tìm thấy khuyến mãi.</div>;

  return (
    <div className="container my-5">
      <button className="btn btn-link text-pink text-decoration-none mb-3 ps-0" onClick={() => navigate(-1)}>
        <FaArrowLeft className="me-2" /> Quay lại
      </button>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="row g-0">
          <div className="col-md-5 position-relative">
             <img 
                src={promo.image_url} 
                className="img-fluid h-100 w-100 object-fit-cover" 
                alt={promo.title} 
                style={{minHeight: '300px'}}
             />
             {/* Overlay giảm giá */}
             <div className="position-absolute top-0 start-0 p-3">
                 <span className="badge bg-danger fs-6 shadow">Giảm {promo.discount_percent}%</span>
             </div>
          </div>
          <div className="col-md-7">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center mb-2 text-pink">
                 <FaGift className="me-2 fs-4" />
                 <span className="fw-bold text-uppercase">Ưu đãi đặc biệt</span>
              </div>
              <h2 className="card-title fw-bold text-dark mb-3">{promo.title}</h2>
              <p className="card-text text-secondary mb-4">{promo.description}</p>

              {/* --- KHUNG HIỂN THỊ MÃ CODE --- */}
              {promo.code && (
                  <div className="bg-light p-4 rounded border border-pink border-dashed text-center mb-4">
                      <p className="text-muted small mb-1">MÃ GIẢM GIÁ CỦA BẠN</p>
                      <h3 className="text-pink fw-bold letter-spacing-2 mb-3">{promo.code}</h3>
                      <button 
                        className={`btn ${copied ? 'btn-success' : 'btn-outline-pink'} rounded-pill px-4`}
                        onClick={handleCopyCode}
                      >
                          {copied ? <><FaCheck className="me-2"/> Đã sao chép</> : <><FaCopy className="me-2"/> Sao chép mã</>}
                      </button>
                  </div>
              )}
              
              {/* Nội dung chi tiết */}
              {promo.content && (
                  <div className="mt-4">
                      <h6 className="fw-bold border-bottom pb-2 mb-3">Điều kiện áp dụng:</h6>
                      <div className="text-muted small" dangerouslySetInnerHTML={{ __html: promo.content }} />
                  </div>
              )}

              {/* Nút sử dụng ngay (Chuyển về trang chủ đặt vé) */}
              <div className="mt-4">
                 <button 
                    className="btn btn-danger btn-lg w-100 fw-bold shadow-sm"
                    onClick={() => navigate('/')}
                 >
                    ĐẶT VÉ NGAY ĐỂ DÙNG MÃ
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetail;