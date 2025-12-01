import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { FaStar } from "react-icons/fa";
import { AuthContext } from "../Context/AuthContext";
import { createApi } from "../utils/api";
import "../css/ReviewSection.css";

export default function ReviewSection({ movieId }) {
  const { getAccessToken, getRefreshToken, logout, user } = useContext(AuthContext);
  // Khởi tạo api instance
  const api = useMemo(() => createApi(getAccessToken, getRefreshToken, logout), [getAccessToken, getRefreshToken, logout]);

  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 0, comment: "" });
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false); // Trạng thái đang gửi

  // === 1. Fetch dữ liệu (Dùng useCallback để tối ưu) ===
  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/movies/${movieId}/reviews`);
      setReviews(res.data);

      // Nếu user đang đăng nhập, tìm xem họ đã review chưa để điền vào form
      if (user) {
        const found = res.data.find((r) => r.user_id === user.id);
        if (found) {
          setForm({ rating: found.rating, comment: found.comment });
        } else {
          setForm({ rating: 0, comment: "" });
        }
      }
    } catch (err) {
      console.error("Lỗi khi lấy review:", err);
    }
  }, [api, movieId, user]);

  // Gọi fetch khi movieId thay đổi
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // === 2. Tính điểm trung bình (Dùng useMemo để tối ưu) ===
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    const total = reviews.reduce((acc, r) => acc + Number(r.rating), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  // === 3. Xử lý gửi form ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!getAccessToken()) return alert("Vui lòng đăng nhập để đánh giá!");
    if (form.rating === 0) return alert("Vui lòng chọn số sao đánh giá!");

    setSubmitting(true); // Bật loading
    try {

      await api.post(`/movies/${movieId}/reviews`, form);
      
      alert("Gửi đánh giá thành công!");
      await fetchReviews(); // Tải lại danh sách ngay lập tức
    } catch (err) {
      console.error("Lỗi khi gửi review:", err);
      const msg = err.response?.data?.message || "Không thể gửi đánh giá lúc này.";
      alert(msg);
    } finally {
      setSubmitting(false); // Tắt loading
    }
  };

  return (
    <div className="review-section">
      <h3 className="section-title-review">Đánh giá phim</h3>

      {/* Hiển thị điểm trung bình */}
      {averageRating ? (
        <div className="average-rating">
          <span className="text-warning me-2"><FaStar /></span> 
          <strong>{averageRating}/5</strong> 
          <span className="text-muted ms-2">({reviews.length} lượt đánh giá)</span>
        </div>
      ) : (
        <p className="no-rating text-muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
      )}

      {/* Form đánh giá */}
      <div className="review-form mt-4">
        {user ? (
          <form onSubmit={handleSubmit} className="p-3 bg-light rounded shadow-sm">
            <div className="mb-3">
              <label className="fw-bold mb-2">Chọn điểm đánh giá:</label>
              <div className="star-rating">
                {[...Array(5)].map((_, i) => {
                  const ratingValue = i + 1;
                  return (
                    <label key={i} style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="rating"
                        value={ratingValue}
                        onClick={() => setForm({ ...form, rating: ratingValue })}
                        style={{ display: "none" }}
                      />
                      <FaStar
                        size={30}
                        className="star me-1"
                        color={ratingValue <= (hover || form.rating) ? "#ffc107" : "#e4e5e9"}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                        style={{ transition: "color 0.2s" }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-bold mb-2">Nhận xét của bạn:</label>
              <textarea
                className="form-control"
                rows="3"
                name="comment"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Phim này thế nào? Hãy chia sẻ cảm nghĩ..."
              />
            </div>

            <button 
              className="btn btn-primary w-100" 
              type="submit" 
              disabled={submitting}
            >
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        ) : (
          <div className="alert alert-warning text-center">
            Vui lòng <a href="/login" className="fw-bold">đăng nhập</a> để viết đánh giá.
          </div>
        )}
      </div>
        
      {/* Danh sách Review */}
      <div className="reviews-list mt-5">
        <h4 className="mb-3 border-bottom pb-2">Bình luận từ khán giả</h4>
        <div className="d-flex flex-column gap-3">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} className={`p-3 rounded ${r.user_id === user?.id ? "bg-white border border-primary" : "bg-white border"}`}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center">
                    <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: 40, height: 40}}>
                      {r.user_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <strong className="d-block">{r.user_name}</strong>
                      {r.user_id === user?.id && <span className="badge bg-primary" style={{fontSize: "0.7rem"}}>Của bạn</span>}
                    </div>
                  </div>
                  <div className="text-warning fw-bold">
                    {r.rating} <FaStar size={14} className="mb-1" />
                  </div>
                </div>
                
                <p className="mb-2 text-break">{r.comment}</p>
                
                <small className="text-muted d-block text-end" style={{fontSize: "0.8rem"}}>
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </small>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-comments fa-2x mb-3"></i>
              <p>Chưa có bình luận nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}