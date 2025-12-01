import React from 'react';
import { FaGift, FaTag, FaPercent } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const PromotionSection = ({ promotions }) => {
  const navigate = useNavigate();

  const handleNavigate = (id) => {
    if (id) navigate(`/promotion/${id}`);
  };

  // Ảnh mặc định nếu không có ảnh
  const defaultImage = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80";

  return (
    <section className="container my-5" id="promotions">
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-pink pb-2">
        <h2 className="text-pink fw-bold m-0 d-flex align-items-center text-uppercase" style={{ letterSpacing: '1px' }}>
           <FaGift className="me-2" size={28} /> Khuyến Mãi & Ưu Đãi
        </h2>
      </div>
      
      {promotions && promotions.length > 0 ? (
        <div className="row g-4">
          {promotions.map((promo) => (
            <div key={promo.id} className="col-12 col-md-6 col-lg-4">
              <div 
                className="promo-card h-100 rounded-4 overflow-hidden shadow-sm cursor-pointer position-relative group-hover bg-white border-0"
                onClick={() => handleNavigate(promo.id)}
                style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
                }}
              >
                {/* --- PHẦN HÌNH ẢNH --- */}
                <div className="ratio ratio-16x9 overflow-hidden position-relative">
                   <img 
                      src={promo.image_url || defaultImage} 
                      alt={promo.title} 
                      className="w-100 h-100 object-fit-cover"
                      style={{ transition: 'transform 0.5s ease' }}
                      onError={(e) => e.target.src = defaultImage}
                   />
                   
                   <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)' }}></div>

                   {/* --- BADGE GIẢM GIÁ --- */}
                   {Number(promo.discount_percent) > 0 && (
                       <div className="position-absolute top-0 end-0 mt-2 me-2">
                           <span 
                               className="badge bg-danger rounded-pill d-flex align-items-center justify-content-center gap-1 shadow-sm"
                               style={{ 
                                   padding: '4px 8px',
                                   fontSize: '0.75rem',
                                   fontWeight: '700',
                                   border: '1px solid rgba(255,255,255,0.2)' 
                               }}
                           >
                               <FaPercent size={10} />
                               <span>Giảm {Math.round(Number(promo.discount_percent))}%</span>
                           </span>
                       </div>
                   )}
                   {/* -------------------------------------------------- */}

                </div>
                
                {/* --- PHẦN NỘI DUNG --- */}
                <div className="p-4 d-flex flex-column h-100" style={{ minHeight: '180px' }}>
                   <h5 className="fw-bold text-dark mb-2 text-truncate" style={{ fontSize: '1.1rem' }} title={promo.title}>
                       {promo.title || promo.name}
                   </h5>
                   
                   <p className="text-muted small mb-4" style={{ 
                       display: '-webkit-box', 
                       WebkitLineClamp: 2, 
                       WebkitBoxOrient: 'vertical', 
                       overflow: 'hidden',
                       lineHeight: '1.5'
                   }}>
                       {promo.description || "Chương trình ưu đãi đặc biệt dành cho khách hàng thân thiết."}
                   </p>
                   
                   {/* --- HIỂN THỊ MÃ CODE--- */}
                   <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                       {promo.code ? (
                           <div className="d-flex align-items-center text-pink">
                               <div className="bg-pink-light p-2 rounded me-2">
                                   <FaTag />
                               </div>
                               <div>
                                   <small className="text-muted d-block" style={{fontSize: '10px', lineHeight: '1'}}>MÃ CODE</small>
                                   <span className="fw-bold" style={{letterSpacing: '1px'}}>{promo.code}</span>
                               </div>
                           </div>
                       ) : (
                           <div className="d-flex align-items-center text-success">
                               <div className="bg-success-subtle p-2 rounded me-2 text-success">
                                   <FaGift />
                               </div>
                               <span className="fw-bold small">Tự động áp dụng</span>
                           </div>
                       )}
                       
                       <button className="btn btn-sm btn-light text-pink fw-bold rounded-pill px-3 border-pink hover-bg-pink hover-text-white transition-all">
                           Chi tiết
                       </button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5 bg-light rounded-4">
            <p className="text-muted m-0">Đang cập nhật chương trình khuyến mãi...</p>
        </div>
      )}
    </section>
  );
};

export default PromotionSection;