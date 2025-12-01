import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import "../AdminCSS/AdminShared.css"; 
import ImageUpload from './ImageUpload';
import RichTextEditor from './RichTextEditor';

export default function BlogsTab({ api }) {
  const [blogs, setBlogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // 1. Thêm author_name vào state (Mặc định là Admin)
  const [formData, setFormData] = useState({ 
      title: '', 
      thumbnail_url: '', 
      content: '',
      author_name: 'Admin'
  });
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  const fetchBlogs = async () => {
    try {
      const res = await api.get('/blogs');
      setBlogs(res.data);
    } catch (err) { console.error("Lỗi tải blogs:", err); }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return alert("Vui lòng nhập đủ thông tin!");

    setLoading(true);
    try {
      if (editingId) {
        // --- CẬP NHẬT ---
        await api.put(`/admin/blogs/${editingId}`, formData);
        alert("Cập nhật bài viết thành công!");

        // --- FIX LỖI: Cập nhật state ngay lập tức để UI đổi tên tác giả luôn ---
        setBlogs(prevBlogs => prevBlogs.map(blog => 
            blog.id === editingId ? { ...blog, ...formData } : blog
        ));
      } else {
        // --- TẠO MỚI ---
        await api.post('/admin/blogs', formData);
        alert("Đăng bài viết thành công!");
        fetchBlogs(); // Load lại danh sách
      }

      // Reset form sau khi thành công
      setShowForm(false);
      setEditingId(null);
      // Reset về mặc định
      setFormData({ title: '', thumbnail_url: '', content: '', author_name: 'Admin' });
      
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (blog) => {
      setEditingId(blog.id);
      setFormData({
          title: blog.title,
          thumbnail_url: blog.thumbnail_url,
          content: blog.content,
          // 2. Lấy tên tác giả cũ
          author_name: blog.author_name || 'Admin' 
      });
      setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    try {
      await api.delete(`/admin/blogs/${id}`);
      fetchBlogs();
    } catch (err) { alert("Lỗi xóa bài viết!"); }
  };

  const handleAddNew = () => {
      setEditingId(null);
      // 3. Reset form khi thêm mới
      setFormData({ title: '', thumbnail_url: '', content: '', author_name: 'Admin' });
      setShowForm(true);
  };

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Quản Lý Tin Tức & Blog</h2>
      </div>

      {!showForm && (
        <button className="btn-add" onClick={handleAddNew}>
          <FaPlus /> Viết Bài Mới
        </button>
      )}

      {showForm && (
        <div className="admin-form" style={{maxWidth: '1000px'}}>
          <h4 style={{ color: '#d63384', marginBottom: '20px', fontWeight: '700' }}>
              {editingId ? `Chỉnh sửa bài viết #${editingId}` : "Soạn bài viết mới"}
          </h4>
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
                <div className="form-group full-width">
                    <label>Tiêu đề bài viết</label>
                    <input 
                        type="text" 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Nhập tiêu đề hấp dẫn..."
                        required
                    />
                </div>

                {/* --- MỚI THÊM: Ô NHẬP TÊN TÁC GIẢ --- */}
                <div className="form-group full-width">
                    <label>Người đăng (Tác giả)</label>
                    <input 
                        type="text" 
                        value={formData.author_name}
                        onChange={e => setFormData({...formData, author_name: e.target.value})}
                        placeholder="Nhập tên người hiển thị (VD: Admin, Ban biên tập...)"
                    />
                </div>

                <div className="form-group full-width">
                    <ImageUpload 
                        label="Ảnh bìa (Thumbnail)"
                        value={formData.thumbnail_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
                        folderName="movie_blogs"
                    />
                </div>

                <div className="form-group full-width">
                    <label>Nội dung bài viết</label>
                    <RichTextEditor 
                        value={formData.content}
                        onChange={(content) => setFormData(prev => ({ ...prev, content: content }))}
                        placeholder="Viết nội dung, chèn ảnh, định dạng văn bản tại đây..."
                    />
                </div>
            </div>
            
            <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                    Hủy bỏ
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? "Đang lưu..." : (editingId ? "Cập nhật bài viết" : "Đăng bài ngay")}
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
              <th style={{width: '100px'}}>Hình ảnh</th>
              <th>Tiêu đề</th>
              <th style={{width: '150px'}}>Người đăng</th>
              <th style={{width: '120px'}}>Ngày tạo</th>
              <th style={{width: '150px', textAlign: 'center'}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {blogs.length > 0 ? blogs.map(blog => (
              <tr key={blog.id}>
                <td><strong>{blog.id}</strong></td>
                <td className="poster-cell">
                  <img src={blog.thumbnail_url} alt="" onError={(e) => e.target.src="https://via.placeholder.com/150"} />
                </td>
                <td style={{fontWeight: '500', color: '#333'}}>{blog.title}</td>
                <td><span className="badge bg-light text-dark border px-2 py-1 rounded">{blog.author_name || "Admin"}</span></td>
                <td>{new Date(blog.created_at).toLocaleDateString('vi-VN')}</td>
                <td style={{textAlign: 'center'}}>
                  <button className="btn-edit" onClick={() => handleEdit(blog)}>
                      <FaEdit /> Sửa
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(blog.id)}>
                    <FaTrash /> Xóa
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center p-4 text-muted">Chưa có bài viết nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}