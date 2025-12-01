import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import "../AdminCSS/BrandsTab.css";
import ImageUpload from './ImageUpload';

export default function BrandsTab({ api }) {
  const [brands, setBrands] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', logo: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchBrands = async () => {
    try {
      const res = await api.get('/admin/brands');
      setBrands(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Vui lòng nhập tên thương hiệu!");

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/admin/brands/${editingId}`, formData);
        alert("Cập nhật thành công!");
      } else {
        await api.post('/admin/brands', formData);
        alert("Thêm thương hiệu thành công!");
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', logo: '' });
      fetchBrands();
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingId(brand.id);
    setFormData({ name: brand.name, logo: brand.logo });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa thương hiệu này?")) return;
    try {
      await api.delete(`/admin/brands/${id}`);
      fetchBrands();
    } catch (err) { alert("Lỗi xóa!"); }
  };

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title">Quản Lý Thương Hiệu (Rạp)</h2>
      </div>

      {!showForm && (
        <button className="btn-add" onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', logo: '' }); }}>
          <FaPlus /> Thêm Thương Hiệu
        </button>
      )}

      {showForm && (
        <div className="admin-form">
          <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
            {editingId ? "Cập nhật thương hiệu" : "Thêm thương hiệu mới"}
          </h4>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
                <div className="form-group">
                    <label>Tên thương hiệu</label>
                    <input type="text" required
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="Ví dụ: CGV, Lotte..."
                    />
                </div>
                
                {/* SỬ DỤNG IMAGE UPLOAD */}
                <div className="form-group">
                    <ImageUpload 
                        label="Logo Thương Hiệu"
                        value={formData.logo}
                        onChange={(url) => setFormData(prev => ({ ...prev, logo: url }))}
                    />
                </div>
            </div>
            
            <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Hủy bỏ</button>
                <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Đang lưu..." : "Lưu lại"}
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
              <th style={{width: '100px'}}>Logo</th>
              <th>Tên thương hiệu</th>
              <th style={{width: '150px', textAlign: 'center'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {brands.length > 0 ? brands.map(b => (
              <tr key={b.id}>
                <td><strong>{b.id}</strong></td>
                <td className="brand-logo-tab">
                  <img src={b.logo} alt={b.name} style={{width: '100%', height: '100%', objectFit: 'contain'}} onError={(e) => e.target.src="https://via.placeholder.com/50"} />
                </td>
                <td style={{fontWeight: '600'}}>{b.name}</td>
                <td style={{textAlign: 'center'}}>
                  <button className="btn-edit" onClick={() => handleEdit(b)}><FaEdit /> Sửa</button>
                  <button className="btn-delete" onClick={() => handleDelete(b.id)}><FaTrash /> Xóa</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="text-center p-4 text-muted">Chưa có dữ liệu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}