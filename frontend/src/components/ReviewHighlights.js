import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaStar, FaQuoteLeft, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function ReviewHighlights({ limit = 3 }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/reviews/highlights?limit=${limit}`
        );
        setReviews(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy review nổi bật:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHighlights();
  }, [limit]);

  if (loading) return (
      <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm text-pink me-2" role="status"></div>
          Đang tải bình luận...
      </div>
  );
  
  if (reviews.length === 0) return <p className="text-center text-muted">Chưa có bình luận nổi bật.</p>;

  return (
    <div className="row g-4">
      {reviews.map((r) => (
        <div key={r.id} className="col-12 col-md-6 col-lg-4">
          <div 
            className="review-card h-100 position-relative overflow-hidden rounded-4 shadow-sm cursor-pointer"
            onClick={() => navigate(`/movie/${r.movie_id}`)}
            style={{
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                border: '1px solid #eee',
                backgroundColor: '#fff'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
            }}
          >
            {/* --- Header: Poster & Movie Title --- */}
            <div className="d-flex align-items-center p-3 border-bottom bg-light">
                <div 
                    className="flex-shrink-0 rounded overflow-hidden shadow-sm"
                    style={{width: '50px', height: '75px'}}
                >
                    <img 
                        src={r.movie_poster || "https://via.placeholder.com/50x75"} 
                        alt={r.movie_title}
                        className="w-100 h-100 object-fit-cover"
                        onError={(e) => e.target.src="https://via.placeholder.com/50x75"}
                    />
                </div>
                <div className="ms-3 overflow-hidden">
                    <h6 className="fw-bold text-dark mb-1 text-truncate" title={r.movie_title}>
                        {r.movie_title}
                    </h6>
                    <div className="d-flex align-items-center">
                        <span className="badge bg-warning text-dark d-flex align-items-center px-2 py-1" style={{fontSize: '0.75rem'}}>
                            <FaStar className="me-1" size={10}/> {r.rating} /5
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Body: Comment Content --- */}
            <div className="p-4 position-relative">
                <FaQuoteLeft className="position-absolute text-pink opacity-25" size={30} style={{top: '15px', left: '15px'}} />
                
                <p 
                    className="text-secondary mb-0 fst-italic"
                    style={{
                        fontSize: "0.95rem",
                        lineHeight: "1.6",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textIndent: "25px", 
                        minHeight: '4.8em' 
                    }}
                    title={r.comment}
                >
                    {r.comment}
                </p>
            </div>

            {/* --- Footer: User Info --- */}
            <div className="p-3 border-top bg-white d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                    {r.user_avatar ? (
                        <img 
                            src={r.user_avatar} 
                            alt={r.user_name} 
                            className="rounded-circle me-2"
                            style={{width: '30px', height: '30px', objectFit: 'cover'}}
                        />
                    ) : (
                        <FaUserCircle className="text-secondary me-2" size={30} />
                    )}
                    <div>
                        <span className="d-block fw-bold text-dark" style={{fontSize: '0.85rem'}}>
                            {r.user_name || "Khán giả ẩn danh"}
                        </span>
                        <span className="d-block text-muted" style={{fontSize: '0.7rem'}}>
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : 'Vừa xong'}
                        </span>
                    </div>
                </div>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}