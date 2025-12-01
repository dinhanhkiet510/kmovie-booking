import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import "../AdminCSS/CombosTab.css";
import ImageUpload from './ImageUpload';

export default function CombosTab({ api }) {
  const [combos, setCombos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '', image: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchCombos = async () => {
    try {
      const res = await api.get('/admin/combos');
      setCombos(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchCombos(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/admin/combos/${editingId}`, formData);
        alert("Cập nhật thành công!");
      } else {
        await api.post('/admin/combos', formData);
        alert("Thêm combo thành công!");
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', price: '', description: '', image: '' });
      fetchCombos();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({ name: c.name, price: c.price, description: c.description, image: c.image });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa combo này?")) return;
    try {
      await api.delete(`/admin/combos/${id}`);
      fetchCombos();
    } catch (err) { alert("Lỗi xóa!"); }
  };

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title">Quản Lý Bắp & Nước (Combo)</h2>
      </div>

      {!showForm && (
        <button className="btn-add" onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', price: '', description: '', image: '' }); }}>
          <FaPlus /> Thêm Combo Mới
        </button>
      )}

      {showForm && (
        <div className="admin-form">
          <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
             {editingId ? "Cập nhật Combo" : "Thêm Combo mới"}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
                <div className="form-group">
                    <label>Tên Combo</label>
                    <input type="text" required
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="VD: Combo Solo, Combo Couple..."
                    />
                </div>
                <div className="form-group">
                    <label>Giá bán (VNĐ)</label>
                    <input type="number" required min="0"
                        value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} 
                        placeholder="VD: 79000"
                    />
                </div>
                
                {/* IMAGE UPLOAD */}
                <div className="form-group" style={{ gridRow: 'span 2' }}>
                    <ImageUpload 
                        label="Hình ảnh Combo"
                        value={formData.image}
                        onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                    />
                </div>

                <div className="form-group full-width">
                    <label>Mô tả chi tiết</label>
                    <textarea rows="3"
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                        placeholder="VD: 1 Bắp ngọt lớn + 2 Nước ngọt vừa..."
                    />
                </div>
            </div>
            <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Hủy bỏ</button>
                <button type="submit" className="btn-save" disabled={loading}>{loading ? "Đang lưu..." : "Lưu lại"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
                <th style={{width: '50px'}}>#ID</th>
                <th style={{width: '100px'}}>Hình ảnh</th>
                <th>Tên Combo</th>
                <th>Giá bán</th>
                <th>Mô tả</th>
                <th style={{width: '150px', textAlign: 'center'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {combos.length > 0 ? combos.map(c => (
              <tr key={c.id}>
                <td><strong>{c.id}</strong></td>
                
                <td className="combo-img-cell">
                    <img 
                        src={c.image || "https://via.placeholder.com/80?text=No+Image"} 
                        alt={c.name} 
                        onError={(e) => e.target.src="https://via.placeholder.com/80?text=Error"} 
                    />
                </td>

                <td style={{fontWeight: '600'}}>{c.name}</td>
                <td className="price-tag">{Number(c.price).toLocaleString()}đ</td>
                <td className="text-muted small">{c.description}</td>
                <td style={{textAlign: 'center'}}>
                  <button className="btn-edit" onClick={() => handleEdit(c)}><FaEdit /> Sửa</button>
                  <button className="btn-delete" onClick={() => handleDelete(c.id)}><FaTrash /> Xóa</button>
                </td>
              </tr>
            )) : (
                <tr><td colSpan="6" className="text-center p-4 text-muted">Chưa có combo nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}