import React, { useState, useEffect } from "react";
import { FaTrash, FaEdit, FaPlus, FaStore } from "react-icons/fa";

const ITEMS_PER_PAGE = 10;

// ===== Form Thêm / Sửa Rạp =====
function TheaterForm({ initialData = {}, brand, onSave, onCancel }) {
  const [data, setData] = useState(initialData);

  const handleChange = (e) =>
    setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Payload gửi lên server
    const payload = {
      name: data.name,
      location: data.location,
      total_seats: parseInt(data.total_seats) || 0, 
      brand_id: brand ? brand.id : data.brand_id,  
    };
    onSave(payload);
  };

  return (
    <div className="admin-form">
      <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
        {initialData.id ? "Cập nhật thông tin rạp" : `Thêm chi nhánh mới cho ${brand?.name || '...'}`}
      </h4>
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
            <div className="form-group">
                <label>Tên rạp / Chi nhánh</label>
                <input
                    type="text"
                    name="name"
                    value={data.name || ""}
                    onChange={handleChange}
                    placeholder="Ví dụ: CGV Aeon Mall..."
                    required
                />
            </div>

            <div className="form-group">
                <label>Tổng số ghế</label>
                <input
                    type="number"
                    name="total_seats"
                    value={data.total_seats || ""}
                    onChange={handleChange}
                    placeholder="Nhập sức chứa (VD: 200)"
                    min="0"
                    required
                />
            </div>

            <div className="form-group full-width">
                <label>Địa chỉ chi tiết</label>
                <input
                    type="text"
                    name="location"
                    value={data.location || ""}
                    onChange={handleChange}
                    placeholder="Nhập địa chỉ rạp..."
                    required
                />
            </div>
        </div>

        <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
                Hủy bỏ
            </button>
            <button type="submit" className="btn-save">
                {initialData.id ? "Lưu thay đổi" : "Tạo mới"}
            </button>
        </div>
      </form>
    </div>
  );
}

// ===== Tab quản lý rạp =====
export default function TheatersTab({ api }) {
  const [data, setData] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State filter & pagination
  const [filterBrand, setFilterBrand] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  
  // State Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null); 
  const [brandSelectOpen, setBrandSelectOpen] = useState(false); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTheaters, resBrands] = await Promise.all([
        api.get("/admin/theaters"),
        api.get("/admin/brands"),
      ]);

      // Map tên brand vào rạp để hiển thị
      const theatersWithBrandName = resTheaters.data.map((t) => ({
        ...t,
        brand_name: resBrands.data.find((b) => b.id === t.brand_id)?.name || "Unknown",
      }));

      setData(theatersWithBrandName);
      setBrands(resBrands.data);
    } catch (err) {
      console.error("Lỗi fetch dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset trang khi đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBrand]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa rạp này?")) return;
    try {
      await api.delete(`/admin/theaters/${id}`);
      setData((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Xóa thất bại");
    }
  };

  const handleSave = async (payload) => {
    try {
      if (editing) {
        // Sửa
        await api.put(`/admin/theaters/${editing.id}`, payload);
        setData((prev) =>
          prev.map((d) =>
            d.id === editing.id
              ? { ...d, ...payload, brand_name: brands.find(b => b.id === payload.brand_id)?.name }
              : d
          )
        );
        alert("Cập nhật thành công!");
      } else {
        // Thêm mới
        const res = await api.post("/admin/theaters", payload);
        setData((prev) => [
          ...prev,
          { ...payload, id: res.data.id, brand_name: selectedBrand.name },
        ]);
        alert("Thêm rạp mới thành công!");
      }

      // Reset state
      setModalOpen(false);
      setEditing(null);
      setSelectedBrand(null);
      setBrandSelectOpen(false);
      
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi thao tác server");
    }
  };

  // --- Logic Filter & Pagination ---
  const filteredData = data.filter(item => {
    if (filterBrand === "All") return true;
    return item.brand_name === filterBrand;
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginated = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) return <div className="text-center p-5">Đang tải dữ liệu...</div>;

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
         <h2 className="page-title">Quản Lý Hệ Thống Rạp</h2>
      </div>

      {/* --- Thanh Công Cụ --- */}
      <div className="controls mb-4" style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px'}}>
        <div className="filter-section d-flex align-items-center">
            <label style={{ fontWeight: "bold", marginRight: "10px", color: '#555',width: '300px' }}><FaStore className="me-1"/> Lọc theo Brand:</label>
            <select 
                className="filter-select"
                value={filterBrand} 
                onChange={(e) => setFilterBrand(e.target.value)}
            >
                <option value="All">Tất cả thương hiệu</option>
                {brands.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                ))}
            </select>
        </div>

        <button className="btn-add" onClick={() => setBrandSelectOpen(true)}>
            <FaPlus /> Thêm Rạp Mới
        </button>
      </div>

      {/* --- Modal 1: Chọn Brand trước khi thêm --- */}
      {brandSelectOpen && !selectedBrand && (
        <div className="modal-overlay">
          <div className="modal-content" style={{width: '400px'}}>
            <h3 className="text-center mb-4" style={{color: '#d63384'}}>Chọn Thương Hiệu</h3>
            <div className="d-flex flex-column gap-2 mb-4">
              {brands.map((b) => (
                <button
                  key={b.id}
                  className="btn btn-outline-secondary py-2 fw-bold"
                  style={{border: '1px solid #ddd', borderRadius: '8px'}}
                  onClick={() => {
                      setSelectedBrand(b); // Chọn brand xong
                      setModalOpen(true);  // Mở form nhập liệu
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = '#d63384'}
                  onMouseOut={(e) => e.target.style.borderColor = '#ddd'}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <button className="btn-cancel w-100" onClick={() => setBrandSelectOpen(false)}>
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* --- Modal 2: Form Nhập liệu (Thêm/Sửa) --- */}
      {(modalOpen && (selectedBrand || editing)) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TheaterForm
              initialData={editing || {}}
              brand={selectedBrand || brands.find(b => b.id === editing.brand_id)}
              onSave={handleSave}
              onCancel={() => {
                setModalOpen(false);
                setEditing(null);
                setSelectedBrand(null);
                setBrandSelectOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* --- Bảng Dữ Liệu --- */}
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>#ID</th>
              <th>Thương hiệu</th>
              <th>Tên Rạp</th>
              <th>Sức chứa</th>
              <th>Địa chỉ</th>
              <th style={{textAlign: 'center'}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.id}</strong></td>
                  <td><span className="branch-badge">{d.brand_name}</span></td>
                  <td style={{fontWeight: '600'}}>{d.name}</td>
                  <td><span className="seat-badge">{d.total_seats || 0} ghế</span></td>
                  <td>{d.location}</td>
                  <td style={{textAlign: 'center'}}>
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setEditing(d);
                        setModalOpen(true);
                      }}
                    >
                      <FaEdit /> Sửa
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(d.id)}
                    >
                      <FaTrash /> Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-5 text-muted">
                   Không có dữ liệu rạp chiếu nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Phân trang --- */}
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