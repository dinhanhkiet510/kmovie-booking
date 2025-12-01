import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaUserEdit, FaArrowLeft } from "react-icons/fa";
import "../css/Home.css"; 

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogDetail = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/blogs/${id}`);
        if (res.ok) {
            const data = await res.json();
            setBlog(Array.isArray(data) ? data[0] : data);
        }
      } catch (err) {
        console.error("Lỗi kết nối:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogDetail();
  }, [id]);

  if (loading) return <div className="text-center py-5 mt-5">Đang tải bài viết...</div>;
  if (!blog) return <div className="text-center py-5 mt-5">Không tìm thấy bài viết.</div>;

  return (
    <div className="container my-5" style={{paddingTop: '20px'}}>
      <button 
        className="btn btn-link text-pink text-decoration-none mb-3 ps-0 fw-bold" 
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft className="me-2" /> Quay lại
      </button>

      <div className="row justify-content-center">
        <div className="col-lg-8 bg-white p-4 rounded shadow-sm">
          <h1 className="fw-bold mb-3 text-dark" style={{lineHeight: '1.4'}}>{blog.title}</h1>
          
          <div className="d-flex align-items-center text-muted mb-4 small border-bottom pb-3">
             <FaCalendarAlt className="me-2" /> 
             {new Date(blog.created_at).toLocaleDateString('vi-VN')}
             <span className="mx-3">•</span>
             <FaUserEdit className="me-2" /> {blog.author_name || "Admin"}
          </div>

          {/* Ảnh bìa chính */}
          <div className="blog-thumbnail mb-4 rounded overflow-hidden">
             <img 
                src={blog.thumbnail_url} 
                alt={blog.title} 
                className="w-100 h-auto object-fit-cover" 
                style={{maxHeight: '500px'}}
                onError={(e) => {e.target.onerror = null; e.target.src="https://via.placeholder.com/800x450"}}
             />
          </div>

          {/* NỘI DUNG BÀI VIẾT (HTML) */}
          <div 
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: blog.content }} 
          />
          
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;