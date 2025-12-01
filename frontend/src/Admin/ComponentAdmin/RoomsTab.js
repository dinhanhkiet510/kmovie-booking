import React, { useEffect, useState } from "react";
import "../AdminCSS/Roomstab.css";

// ===== Form Component (Trong Modal) =====
function RoomForm({ initialData = {}, branches, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    total_seats: initialData.total_seats || 80,
    brand_id: initialData.brand_id || ""
  });

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.brand_id) {
      alert("Vui lòng chọn chi nhánh!");
      return;
    }
    // Chuyển brand_id và total_seats sang số để đảm bảo API nhận đúng
    onSave({
      ...formData,
      total_seats: parseInt(formData.total_seats),
      brand_id: parseInt(formData.brand_id)
    });
  };

  return (
    <form className="room-form" onSubmit={handleSubmit}>
      <h3 className="form-title">
        {initialData.id ? "Cập nhật Phòng Chiếu" : "Thêm Phòng Chiếu"}
      </h3>

      <div className="form-field">
        <label>Tên phòng</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ví dụ: Cinema 01, IMAX..."
          required
          autoFocus
        />
      </div>

      <div className="form-field">
        <label>Sức chứa (Ghế)</label>
        <input
          type="number"
          name="total_seats"
          value={formData.total_seats}
          onChange={handleChange}
          placeholder="Ví dụ: 120"
          min="1"
          required
        />
      </div>

      <div className="form-field">
        <label>Thuộc chi nhánh</label>
        <select
          name="brand_id"
          value={formData.brand_id}
          onChange={handleChange}
          required
        >
          <option value="">-- Chọn chi nhánh --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.location ? `— ${b.location}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Đóng
        </button>
        <button type="submit" className="btn-primary">
          {initialData.id ? "Lưu thay đổi" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}

// ===== Main Component =====
export default function RoomsTab({ api, accessToken }) {
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination & Modal State
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const ITEMS_PER_PAGE = 10;

  // Config Header cho API calls
  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  useEffect(() => {
    fetchRooms();
    fetchBranches();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/theaters", authHeader);
      setRooms(res.data);
    } catch (err) {
      console.error(err);
      // alert("Không thể tải danh sách phòng"); // Có thể bật lại nếu cần
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/admin/brands", authHeader);
      setBranches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (payload) => {
    try {
      if (editingRoom) {
        await api.put(`/admin/theaters/${editingRoom.id}`, payload, authHeader);
        // Update local state để đỡ phải fetch lại
        setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...payload } : r));
      } else {
        const res = await api.post("/admin/theaters", payload, authHeader);
        // Giả sử API trả về object vừa tạo, nếu không thì phải fetchRooms()
        setRooms(prev => [...prev, res.data || { ...payload, id: Date.now() }]); 
        fetchRooms(); // Fetch lại cho chắc chắn có ID
      }
      setModalOpen(false);
      setEditingRoom(null);
    } catch (err) {
      alert(err.response?.data?.message || "Thao tác thất bại");
    }
  };

  const deleteRoom = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa phòng chiếu này?")) return;
    try {
      await api.delete(`/admin/theaters/${id}`, authHeader);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert("Xóa thất bại: " + (err.response?.data?.message || err.message));
    }
  };

  // Logic Pagination
  const totalPages = Math.ceil(rooms.length / ITEMS_PER_PAGE);
  const paginatedRooms = rooms.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Helper để lấy tên chi nhánh từ ID
  const getBranchName = (id) => {
    const branch = branches.find((b) => b.id === id);
    return branch ? branch.name : "N/A";
  };

  return (
    <div className="rooms-page-container">
      <div className="content-card">
        {/* Header */}
        <div className="header-section">
          <h2 className="page-title">Quản lý Phòng Chiếu</h2>
          <button
            className="btn-add"
            onClick={() => {
              setEditingRoom(null);
              setModalOpen(true);
            }}
          >
            + Thêm Phòng
          </button>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th width="80">ID</th>
                <th>Tên phòng</th>
                <th>Sức chứa</th>
                <th>Chi nhánh</th>
                <th width="150">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign:"center", padding: 20}}>🌸 Đang tải dữ liệu...</td></tr>
              ) : paginatedRooms.length > 0 ? (
                paginatedRooms.map((r) => (
                  <tr key={r.id}>
                    <td><b>#{r.id}</b></td>
                    <td style={{fontWeight: "500"}}>{r.name}</td>
                    <td>
                      <span className="seat-badge">{r.total_seats} Ghế</span>
                    </td>
                    <td>
                      <span className="branch-badge">
                         {getBranchName(r.brand_id)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => {
                          setEditingRoom(r);
                          setModalOpen(true);
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => deleteRoom(r.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state" style={{textAlign: "center", padding: 30, color: "#999"}}>
                    Chưa có phòng chiếu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Modal Form */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RoomForm
              initialData={editingRoom || {}}
              branches={branches}
              onSave={handleSave}
              onCancel={() => {
                setModalOpen(false);
                setEditingRoom(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}