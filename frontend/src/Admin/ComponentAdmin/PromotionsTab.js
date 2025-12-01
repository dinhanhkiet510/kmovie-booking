import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaTag, FaCalendarAlt, FaPercent, FaEdit } from 'react-icons/fa';
import "../AdminCSS/AdminShared.css"; 
import ImageUpload from './ImageUpload';

export default function PromotionsTab({ api }) {
  const [promotions, setPromotions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // State form (Thêm is_active)
  const [formData, setFormData] = useState({ 
      title: '', 
      image_url: '', 
      code: '', 
      discount_percent: '', 
      start_date: '', 
      end_date: '', 
      description: '', 
      content: '',
      is_active: 1 
  });
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); // State để biết đang sửa ID nào

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/promotions'); 
      setPromotions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchPromotions(); }, []);

  // Helper: Chuyển đổi ngày từ ISO (2025-11-25T00:00...) sang YYYY-MM-DD để hiện vào input
  const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        // --- GỌI API SỬA ---
        await api.put(`/admin/promotions/${editingId}`, formData);
        alert("Cập nhật khuyến mãi thành công!");
      } else {
        // --- GỌI API THÊM ---
        await api.post('/admin/promotions', formData);
        alert("Thêm khuyến mãi thành công!");
      }
      
      handleCancel(); // Đóng form và reset
      fetchPromotions();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý khi bấm nút Sửa
  const handleEdit = (promo) => {
      setEditingId(promo.id);
      setFormData({
          title: promo.title || '',
          image_url: promo.image_url || '',
          code: promo.code || '',
          discount_percent: promo.discount_percent || 0,
          start_date: formatDateForInput(promo.start_date),
          end_date: formatDateForInput(promo.end_date),
          description: promo.description || '',
          content: promo.content || '',
          is_active: promo.is_active
      });
      setShowForm(true);
  };

  // Hàm reset form
  const handleCancel = () => {
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
          title: '', image_url: '', code: '', discount_percent: '', 
          start_date: '', end_date: '', description: '', content: '', is_active: 1 
      });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa khuyến mãi này?")) return;
    try {
      await api.delete(`/admin/promotions/${id}`);
      fetchPromotions();
    } catch (err) { alert("Lỗi xóa!"); }
  };

  const defaultImage = "https://placehold.co/600x400?text=No+Image";

  return (
    <div className="tab-content">
      <style>{`
        .custom-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 26px;
        }
        .custom-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .slider {
            background-color: #2e7d32; /* Màu xanh lá khi bật */
        }
        input:checked + .slider:before {
            transform: translateX(24px);
        }
        .status-label {
            margin-left: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            user-select: none;
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Quản Lý Chương Trình Khuyến Mãi</h2>
      </div>

      {!showForm && (
        <button className="btn-add" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <FaPlus /> Thêm Khuyến Mãi Mới
        </button>
      )}

      {showForm && (
        <div className="admin-form">
          <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
             {editingId ? "Cập nhật chương trình" : "Thêm chương trình mới"}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
                {/* Tên & Code */}
                <div className="form-group">
                    <label>Tên chương trình <span className="text-danger">*</span></label>
                    <input type="text" required
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder="Ví dụ: Hè Rực Rỡ..."
                    />
                </div>
                <div className="form-group">
                    <label><FaTag className="me-1"/> Mã Code (Optional)</label>
                    <input type="text" 
                        value={formData.code} 
                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                        placeholder="VD: SUMMER2025"
                    />
                </div>

                {/* Upload Ảnh */}
                <div className="form-group">
                    <ImageUpload 
                        label="Banner Quảng Cáo"
                        value={formData.image_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                        folderName="movie_promos"
                    />
                </div>

                {/* Giảm giá & Trạng thái */}
                <div className="form-group">
                    <label><FaPercent className="me-1"/> Mức giảm (%)</label>
                    <input type="number" min="0" max="100"
                        value={formData.discount_percent} 
                        onChange={e => setFormData({...formData, discount_percent: e.target.value})} 
                        placeholder="VD: 20"
                    />
                    
                    <div className="mt-4 d-flex align-items-center">
                        <label className="custom-switch">
                            <input 
                                type="checkbox" 
                                checked={formData.is_active === 1}
                                onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                            />
                            <span className="slider"></span>
                        </label>
                        <span className="status-label" style={{color: formData.is_active ? '#2e7d32' : '#757575'}}>
                            {formData.is_active ? 'Đang hoạt động (Public)' : 'Tạm ẩn (Draft)'}
                        </span>
                    </div>

                </div>

                {/* Thời gian */}
                <div className="form-group">
                    <label><FaCalendarAlt className="me-1"/> Ngày bắt đầu</label>
                    <input type="date" 
                        value={formData.start_date} 
                        onChange={e => setFormData({...formData, start_date: e.target.value})} 
                    />
                </div>
                <div className="form-group">
                    <label><FaCalendarAlt className="me-1"/> Ngày kết thúc</label>
                    <input type="date" 
                        value={formData.end_date} 
                        onChange={e => setFormData({...formData, end_date: e.target.value})} 
                    />
                </div>

                {/* Nội dung */}
                <div className="form-group full-width">
                    <label>Mô tả ngắn</label>
                    <input type="text" required
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        placeholder="Mô tả ngắn gọn hiển thị trên thẻ..."
                    />
                </div>
                <div className="form-group full-width">
                    <label>Chi tiết & Điều kiện (HTML)</label>
                    <textarea rows="4"
                        value={formData.content} 
                        onChange={e => setFormData({...formData, content: e.target.value})} 
                        placeholder="Nhập nội dung chi tiết (Hỗ trợ tag HTML)..."
                    />
                </div>
            </div>
            <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancel}>Hủy bỏ</button>
                <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Đang lưu..." : (editingId ? "Cập nhật" : "Lưu mới")}
                </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
                <th style={{width: '50px'}}>#ID</th>
                <th style={{width: '100px'}}>Banner</th>
                <th>Tên chương trình</th>
                <th>Mã Code</th>
                <th>Giảm giá</th>
                <th>Trạng thái</th>
                <th style={{width: '150px', textAlign: 'center'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length > 0 ? promotions.map(p => {
              // Logic tự động kiểm tra ngày hết hạn của mã 
              const isExpired = p.end_date && new Date(p.end_date) < new Date();
              const opacity = (p.is_active && !isExpired) ? 1 : 0.6;

              return (
                <tr key={p.id} style={{opacity: opacity}}>
                  <td><strong>{p.id}</strong></td>
                  <td className="poster-cell">
                      <img src={p.image_url || defaultImage} alt="" onError={(e) => e.target.src = defaultImage} />
                  </td>
                  <td>
                      <div style={{fontWeight: '600', color: '#d63384'}}>{p.title || p.name}</div>
                      <small className="text-muted">{p.description}</small>
                  </td>
                  <td>
                      {p.code ? <span className="badge bg-light text-dark border px-2">{p.code}</span> : '-'}
                  </td>
                  <td className="text-danger fw-bold">
                      {p.discount_percent > 0 ? `-${p.discount_percent}%` : ''}
                  </td>
                  <td>
                      {/* Khi hết hạn mã khuyến mãi sẽ tự đọng cập nhập trạng thái hoạt động */}
                      {isExpired ? (
                          <span className="branch-badge" style={{backgroundColor: '#ffebee', color: '#c62828'}}>Hết hạn</span>
                      ) : p.is_active ? (
                          <span className="branch-badge" style={{backgroundColor: '#e8f5e9', color: '#2e7d32'}}>Hoạt động</span>
                      ) : (
                          <span className="branch-badge" style={{backgroundColor: '#f5f5f5', color: '#666'}}>Đã ẩn</span>
                      )}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button className="btn-edit" onClick={() => handleEdit(p)} title="Sửa">
                        <FaEdit />
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(p.id)} title="Xóa">
                        <FaTrash />
                    </button>
                  </td>
                </tr>
              );
            }) : (
                <tr><td colSpan="7" className="text-center p-4 text-muted">Chưa có chương trình khuyến mãi nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}