import React, { useState, useEffect } from "react";
import ImageUpload from "./ImageUpload"; 

const FIELD_LABELS = {
  title: "Tên phim",
  poster_url: "Poster",
  description: "Mô tả",
  duration: "Thời lượng (phút)",
  rating: "Đánh giá",
  release_date: "Ngày khởi chiếu",
  production_year: "Năm SX",
  country_id: "Mã Quốc gia",
  trailer_url: "Link Trailer"
};

const TABLE_COLUMNS = [
  "poster_url", "title", "duration", 
  "rating", "release_date", "production_year"
];

// ===== MOVIE FORM =====
function MovieForm({ initialData = {}, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="admin-form">
      <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
        {initialData.id ? "Chỉnh sửa phim" : "Thêm phim mới"}
      </h4>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
            {/* Tên phim */}
            <div className="form-group full-width">
                <label>Tên phim</label>
                <input type="text" name="title" value={formData.title || ""} onChange={handleChange} required />
            </div>

            {/* --- SỬ DỤNG IMAGE UPLOAD TẠI ĐÂY --- */}
            <div className="form-group" style={{ gridRow: 'span 3' }}>
                <ImageUpload 
                    label="Poster Phim"
                    value={formData.poster_url || ""}
                    onChange={(url) => setFormData(prev => ({ ...prev, poster_url: url }))}
                />
            </div>
            {/* ------------------------------------ */}

            <div className="form-group">
                <label>Thời lượng (phút)</label>
                <input type="number" name="duration" value={formData.duration || ""} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Đánh giá (IMDb)</label>
                <input type="number" step="0.1" name="rating" value={formData.rating || ""} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>Năm sản xuất</label>
                <input type="number" name="production_year" value={formData.production_year || ""} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>Quốc gia (ID)</label>
                <input type="number" name="country_id" value={formData.country_id || ""} onChange={handleChange} required />
            </div>
            <div className="form-group">
                <label>Ngày khởi chiếu</label>
                <input type="date" name="release_date" value={formData.release_date ? formData.release_date.split('T')[0] : ""} onChange={handleChange} required />
            </div>
            <div className="form-group full-width">
                <label>Link Trailer (Youtube)</label>
                <input type="text" name="trailer_url" value={formData.trailer_url || ""} onChange={handleChange} />
            </div>
            <div className="form-group full-width">
                <label>Mô tả nội dung</label>
                <textarea name="description" rows="4" value={formData.description || ""} onChange={handleChange} required />
            </div>
        </div>
      
        <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>Hủy bỏ</button>
            <button type="submit" className="btn-save">
                {initialData.id ? "Lưu thay đổi" : "Tạo mới"}
            </button>
        </div>
      </form>
    </div>
  );
}

// ===== MOVIES TAB (Giữ nguyên logic fetch/delete) =====
export default function MoviesTab({ user, api }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingMovie, setEditingMovie] = useState(null);
  const [adding, setAdding] = useState(false);

  const isAdmin = user?.roles?.includes("admin");

  const fetchMovies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/movies");
      setMovies(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMovies(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phim này không?")) return;
    try {
      await api.delete(`/admin/movies/${id}`);
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveEdit = async (data) => {
    try {
      await api.put(`/admin/movies/${data.id}`, data);
      setMovies((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setEditingMovie(null);
      alert("Cập nhật thành công!");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveAdd = async (data) => {
    try {
      const res = await api.post("/admin/movies", data);
      setMovies((prev) => [...prev, { ...data, id: res.data.id }]);
      setAdding(false);
      alert("Thêm mới thành công!");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "";

  if (loading) return <div className="text-center p-4">Đang tải dữ liệu...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);
  const paginated = movies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title">Quản lý Phim</h2>
      </div>

      {isAdmin && adding && <MovieForm initialData={{}} onSave={handleSaveAdd} onCancel={() => setAdding(false)} />}
      {isAdmin && editingMovie && <MovieForm initialData={editingMovie} onSave={handleSaveEdit} onCancel={() => setEditingMovie(null)} />}
      
      {isAdmin && !adding && !editingMovie && (
        <button onClick={() => setAdding(true)} className="btn-add">
          + Thêm Phim Mới
        </button>
      )}

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>#ID</th>
              {TABLE_COLUMNS.map((key) => <th key={key}>{FIELD_LABELS[key] || key}</th>)}
              {isAdmin && <th style={{textAlign: 'center'}}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? paginated.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.id}</strong></td>
                  {TABLE_COLUMNS.map((key) => (
                    <td key={key} className={key === 'poster_url' ? 'poster-cell' : ''}>
                      {key === "poster_url" ? (
                         <img src={m[key]} alt={m.title} onError={(e) => e.target.src="https://via.placeholder.com/50"} />
                      ) : key.includes("date") ? (
                        formatDate(m[key])
                      ) : (
                        m[key]
                      )}
                    </td>
                  ))}
                  {isAdmin && (
                    <td style={{textAlign: 'center', minWidth: '140px'}}>
                      <button onClick={() => setEditingMovie(m)} className="btn-edit">Sửa</button>
                      <button onClick={() => handleDelete(m.id)} className="btn-delete">Xóa</button>
                    </td>
                  )}
                </tr>
              )) : <tr><td colSpan="8" className="text-center p-4">Chưa có dữ liệu.</td></tr>}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setCurrentPage(p)} className={p === currentPage ? "active" : ""}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}