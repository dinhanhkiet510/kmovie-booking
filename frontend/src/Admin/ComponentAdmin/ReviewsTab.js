import React, { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";
export default function ReviewsTab({ api }) {
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [movies, setMovies] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Filter state
  const [selectedMovie, setSelectedMovie] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // ----- Fetch Data (Reviews, Users, Movies) -----
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Gọi song song 3 API để lấy dữ liệu cần thiết
      const [resReviews, resUsers, resMovies] = await Promise.all([
        api.get("/admin/reviews"),
        api.get("/admin/users"),
        api.get("/admin/movies"),
      ]);

      setReviews(resReviews.data);
      setUsers(resUsers.data);
      setMovies(resMovies.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----- Delete review -----
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa đánh giá này?")) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // ----- Xử lý dữ liệu hiển thị (Mapping tên + Filter + Sort) -----
  const processedReviews = reviews.map((r) => {
    // Tìm tên user và tên phim dựa trên ID
    const user = users.find((u) => u.id === r.user_id);
    const movie = movies.find((m) => m.id === r.movie_id);

    return {
      ...r,
      user_name: user ? user.name : `User #${r.user_id}`, // Fallback nếu ko tìm thấy
      movie_title: movie ? movie.title : `Movie #${r.movie_id}`,
    };
  });

  // 1. Lọc theo phim (nếu có chọn)
  const filteredList = selectedMovie
    ? processedReviews.filter((r) => r.movie_id === Number(selectedMovie))
    : processedReviews;

  // 2. Sắp xếp mặc định: Mới nhất lên đầu (dựa vào created_at hoặc id)
  const sortedList = [...filteredList].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Phân trang
  const totalPages = Math.ceil(sortedList.length / ITEMS_PER_PAGE);
  const paginated = sortedList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset trang về 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMovie]);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="tab-content">
      <div className="header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap" }}>
        <h2 className="page-title">Quản lý Đánh giá</h2>
        
        {/* Bộ lọc phim */}
        <div className="filter-group mt-2">
            <label style={{ marginRight: "10px", fontWeight: "bold" }}>Lọc theo phim:</label>
            <select 
                value={selectedMovie} 
                onChange={(e) => setSelectedMovie(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
                <option value="">-- Tất cả phim (Mới nhất trước) --</option>
                {movies.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                ))}
            </select>
        </div>
      </div>

      {sortedList.length === 0 ? (
        <p>Không có đánh giá nào.</p>
      ) : (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Người dùng</th>
              <th>Phim</th>
              <th>Điểm (Sao)</th>
              <th>Nội dung</th>
              <th>Ngày đánh giá</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td style={{ fontWeight: "bold", color: "#444" }}>{r.user_name}</td>
                <td>{r.movie_title}</td>
                <td>{r.rating} <FaStar color="#ffc107" size={20}/></td>
                <td style={{ maxWidth: "300px" }}>{r.comment}</td>
                <td>{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(r.id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={p === currentPage ? "active" : ""}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}