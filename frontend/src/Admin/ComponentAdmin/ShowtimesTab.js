import React, { useState, useEffect } from "react";
import "../AdminCSS/ShowtimesTab.css";

// ===== Form Thêm / Sửa =====
function ShowtimeForm({ initialData = {}, movies = [], theaters = [], onSave, onCancel }) {
  const [data, setData] = useState(initialData);
  const handleChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanData = {
      ...data,
      movie_id: Number(data.movie_id),
      theater_id: Number(data.theater_id),
      format: data.format || "2D",
      created_at: data.created_at || new Date().toISOString(),
    };
    onSave(cleanData);
  };

  return (
    <form className="showtime-form" onSubmit={handleSubmit}>
      <h3 className="form-title">{initialData.id ? "Cập nhật lịch chiếu" : "Thêm lịch chiếu mới"}</h3>
      <div className="form-grid">
        <div className="form-field">
          <label>Phim</label>
          <select name="movie_id" value={data.movie_id || ""} onChange={handleChange} required>
            <option value="">--Chọn phim--</option>
            {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Rạp</label>
          <select name="theater_id" value={data.theater_id || ""} onChange={handleChange} required>
            <option value="">--Chọn rạp--</option>
            {theaters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Ngày chiếu</label>
          <input type="date" name="show_date" value={data.show_date || ""} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Giờ chiếu</label>
          <input type="time" name="show_time" value={data.show_time || ""} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Giá cơ bản (VNĐ)</label>
          <input type="number" name="base_price" value={data.base_price || ""} onChange={handleChange} min="0" required />
        </div>
        <div className="form-field">
          <label>Format</label>
          <select name="format" value={data.format || "2D"} onChange={handleChange}>
            <option value="2D">2D</option>
            <option value="3D">3D</option>
            <option value="IMAX">IMAX</option>
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Lưu</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Hủy</button>
      </div>
    </form>
  );
}

// ===== Helper: Lấy ngày hôm nay dạng YYYY-MM-DD theo giờ địa phương =====
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ===== Tab Lịch chiếu =====
export default function ShowtimesTab({ user, api }) {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // --- 1. Set mặc định là ngày hôm nay ---
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedBrand, setSelectedBrand] = useState("");

  // --- 2. Tạo danh sách 7 ngày tới (bao gồm hôm nay) ---
  const next7Days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
        value: `${year}-${month}-${day}`,
        label: `${day}/${month}/${year}` + (i === 0 ? " (Hôm nay)" : "")
    };
  });

  // ----- Fetch dữ liệu -----
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [showRes, movieRes, theaterRes, brandRes] = await Promise.all([
          api.get("/admin/showtimes"),
          api.get("/admin/movies"),
          api.get("/admin/theaters"),
          api.get("/admin/brands"),
        ]);

        setShowtimes(showRes.data);
        setMovies(movieRes.data);
        setTheaters(theaterRes.data);
        setBrands(brandRes.data);
      } catch (err) {
        setError(err.message || "Lỗi fetch dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api]);

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa lịch chiếu này?")) return;
    try {
      await api.delete(`/admin/showtimes/${id}`);
      setShowtimes(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message || "Xóa thất bại");
    }
  };

  const isAdmin = user?.roles?.includes("admin");

  const showtimesWithNames = showtimes.map(s => ({
    ...s,
    movie_name: movies.find(m => m.id === Number(s.movie_id))?.title || "",
    theater_name: theaters.find(t => t.id === Number(s.theater_id))?.name || "",
    brand_id: theaters.find(t => t.id === Number(s.theater_id))?.brand_id || ""
  }));

  const filteredShowtimes = showtimesWithNames.filter(s => {
    // 1. Tạo đối tượng Date từ chuỗi ISO trả về
    const dateObj = new Date(s.show_date);
    
    // 2. Lấy ngày, tháng, năm theo giờ địa phương (Local Time)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    // 3. Tạo chuỗi YYYY-MM-DD chuẩn theo giờ VN
    const sDate = `${year}-${month}-${day}`;

    if (selectedDate && sDate !== selectedDate) return false;
    if (selectedBrand && s.brand_id !== Number(selectedBrand)) return false;
    return true;
  });

  const groupedByTheater = theaters.map(t => ({
    ...t,
    showtimes: filteredShowtimes.filter(s => s.theater_id === t.id),
  }));

  // --- 3. Kiểm tra xem có dữ liệu hiển thị không ---
  const hasData = groupedByTheater.some(t => t.showtimes.length > 0);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="tab-content">
      <div className="header-bar">
        <h2 className="page-title">Lịch chiếu</h2>
        {isAdmin && (
          <button className="btn-add" onClick={() => { setEditing(null); setModalOpen(true); }}>
            Thêm lịch chiếu
          </button>
        )}
      </div>

      <div className="filter-bar">
        <label>Chọn ngày: </label>
        <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
          {/* Render danh sách 7 ngày */}
          {next7Days.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        <label>Chọn brand: </label>
        <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
          <option value="">--Tất cả brand--</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* --- 4. Hiển thị thông báo nếu không có lịch chiếu --- */}
      {!hasData ? (
        <div style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>
          <h3>Hiện chưa có lịch chiếu</h3>
          <p>Vui lòng chọn ngày khác hoặc thêm lịch mới.</p>
        </div>
      ) : (
        groupedByTheater.map(t => t.showtimes.length > 0 && (
          <div key={t.id} className="theater-section">
            <h3>{t.name}</h3>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th className="col-movie">Phim</th>
                  <th>Giờ</th>
                  <th>Giá cơ bản</th>
                  <th>Format</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {t.showtimes.map(s => (
                  <tr key={s.id}>
                    <td>{s.movie_name}</td>
                    <td>{s.show_time}</td>
                    <td>{Number(s.base_price).toLocaleString()} đ</td>
                    <td>{s.format}</td>
                    {isAdmin && (
                      <td>
                        <button onClick={() => { setEditing(s); setModalOpen(true); }} className="btn-edit">Sửa</button>
                        <button onClick={() => handleDelete(s.id)} className="btn-delete">Xóa</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ShowtimeForm
              initialData={editing || {}}
              movies={movies}
              theaters={theaters}
              onSave={async (data) => {
                try {
                  const payload = {
                    movie_id: Number(data.movie_id),
                    theater_id: Number(data.theater_id),
                    show_date: data.show_date,
                    show_time: data.show_time,
                    base_price: Number(data.base_price),
                    format: data.format || "2D",
                    created_at: data.created_at || new Date().toISOString(),
                  };

                  let res;
                  if (editing) {
                    res = await api.put(`/admin/showtimes/${editing.id}`, payload);
                    setShowtimes(prev => prev.map(s => s.id === editing.id ? { ...s, ...payload } : s));
                  } else {
                    res = await api.post("/admin/showtimes", payload);
                    setShowtimes(prev => [...prev, { ...payload, id: res.data.id }]);
                  }

                  setModalOpen(false);
                  setEditing(null);
                  alert(editing ? "Cập nhật thành công!" : "Thêm thành công!");
                } catch (err) {
                  alert(err.message || "Lỗi thao tác");
                }
              }}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}