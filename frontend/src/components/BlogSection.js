import React, { useState } from 'react';
import { FaNewspaper, FaCalendarAlt, FaUserEdit, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BlogSection = ({ blogs }) => {
  const navigate = useNavigate();
  
  const [visibleCount, setVisibleCount] = useState(4);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 4);
  };

  const handleNavigate = (id) => {
    if (id) navigate(`/blog/${id}`);
  };

  const stripHtml = (html) => {
    if (!html) return "";
    
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let text = doc.body.textContent || "";

        return text.replace(/<[^>]*>?/gm, '');
    } catch (e) {
        return html; 
    }
  };

  if (!blogs || blogs.length === 0) {
    return null;
  }

  return (
    <section className="container my-5" id="blogs">
      <div className="d-flex align-items-center mb-4 pb-2 border-bottom border-pink">
        <h2 className="text-pink fw-bold m-0 d-flex align-items-center text-uppercase" style={{ letterSpacing: '1px' }}>
           <FaNewspaper className="me-3" size={28} /> Góc Điện Ảnh
        </h2>
      </div>

      <div className="row g-4">
        {/* --- CỘT TRÁI: BLOG MỚI NHẤT --- */}
        <div className="col-lg-7"> 
            <div className="sticky-top" style={{ top: '100px', zIndex: 1 }}>
                <div 
                    className="blog-card-large position-relative rounded-4 overflow-hidden shadow-lg cursor-pointer"
                    onClick={() => handleNavigate(blogs[0].id)}
                    style={{ height: '500px' }} 
                >
                    <img 
                      src={blogs[0].thumbnail_url || "https://via.placeholder.com/800x600"} 
                      alt={blogs[0].title}
                      className="w-100 h-100 object-fit-cover transition-transform"
                      style={{ transition: 'transform 0.6s ease' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    <div 
                        className="position-absolute bottom-0 start-0 w-100 p-4 text-white"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)' }}
                    >
                        <span className="badge bg-pink mb-3 px-3 py-2 rounded-pill text-uppercase shadow-sm" style={{ fontSize: '0.75rem', letterSpacing: '1px', backgroundColor: '#ff477e' }}>
                            Tin Nổi Bật
                        </span>
                        <h3 className="fw-bold mb-2 display-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: '1.75rem' }}>
                            {blogs[0].title}
                        </h3>
                        <div className="d-flex align-items-center text-light opacity-75 small mt-3">
                            <span className="d-flex align-items-center me-4">
                                <FaCalendarAlt className="me-2" /> 
                                {new Date(blogs[0].created_at || Date.now()).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="d-flex align-items-center">
                                <FaUserEdit className="me-2" /> {blogs[0].author_name || "Admin"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- CỘT PHẢI: DANH SÁCH TIN TỨC KHÁC --- */}
        <div className="col-lg-5">
            <div className="d-flex flex-column gap-3">
                {blogs.slice(1, visibleCount).map((blog) => (
                    <div 
                        key={blog.id} 
                        className="blog-card-small d-flex bg-white rounded-3 shadow-sm overflow-hidden cursor-pointer border border-light"
                        onClick={() => handleNavigate(blog.id)}
                        style={{ transition: 'transform 0.2s, box-shadow 0.2s', height: '110px' }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 .5rem 1rem rgba(0,0,0,.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
                        }}
                    >
                        <div className="blog-thumb position-relative" style={{ width: '140px', minWidth: '140px' }}>
                            <img 
                                src={blog.thumbnail_url || "https://via.placeholder.com/300x200"} 
                                alt={blog.title} 
                                className="w-100 h-100 object-fit-cover"
                            />
                        </div>
                        <div className="p-3 d-flex flex-column justify-content-between flex-grow-1 overflow-hidden">
                            <div>
                                <h6 className="fw-bold text-dark mb-1 text-truncate" title={blog.title}>
                                    {blog.title}
                                </h6>
                                {/* ÁP DỤNG HÀM STRIPHTML MỚI */}
                                <p className="text-muted small mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
                                    {stripHtml(blog.content)}
                                </p>
                            </div>
                            <div className="d-flex justify-content-end align-items-center mt-1">
                                <small className="text-pink fw-bold d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                                    Đọc tiếp <FaChevronRight size={10} className="ms-1" />
                                </small>
                            </div>
                        </div>
                    </div>
                ))}
                
                {visibleCount < blogs.length && (
                    <button 
                        className="btn btn-outline-pink w-100 py-2 fw-bold rounded-pill mt-2 transition-all"
                        onClick={handleLoadMore}
                        style={{ border: '2px solid #ff477e', color: '#ff477e' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#ff477e'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff477e'; }}
                    >
                        Xem thêm tin cũ hơn <FaChevronDown className="ms-1" size={12}/>
                    </button>
                )}
            </div>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;