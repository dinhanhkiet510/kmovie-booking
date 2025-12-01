import React, { useState, useContext } from 'react';
import { FaRobot, FaPaperPlane, FaMagic, FaTicketAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../Context/AuthContext';
import axios from 'axios';
import "../css/Home.css"; // Dùng chung CSS hoặc tạo file riêng

const AIRecommender = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { message: "", movies: [] }

  const handleAskAI = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post("http://localhost:5000/api/ai/recommend", {
        query: query,
        // Gửi kèm ngữ cảnh user (nếu có)
        userContext: {
             age: user?.birth_date ? new Date().getFullYear() - new Date(user.birth_date).getFullYear() : null,
             preferences: "Thích phim hành động, hài hước" // (Có thể lấy từ lịch sử đặt vé nếu muốn nâng cao)
        }
      });

      setResult(res.data);
    } catch (err) {
      console.error("AI Error:", err);
      setResult({ message: "Xin lỗi, AI đang quá tải. Bạn hãy thử lại nhé!", movies: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container my-5">
      {/* Khung AI Container */}
      <div className="p-5 rounded-4 shadow-lg position-relative overflow-hidden" 
           style={{ background: 'linear-gradient(135deg, #2C3E50 0%, #000000 100%)', color: 'white' }}>
        
        {/* Background Effects */}
        <div className="position-absolute top-0 end-0 p-5" style={{ background: '#d63384', filter: 'blur(100px)', width: '300px', height: '300px', opacity: 0.3, borderRadius: '50%' }}></div>

        <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
          
          {/* CỘT TRÁI: INPUT & INTRO */}
          <div className="col-lg-5 mb-4 mb-lg-0">
            <div className="d-flex align-items-center mb-3">
                <div className="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '60px', height: '60px'}}>
                    <FaRobot size={32} className="text-pink" />
                </div>
                <div>
                    <h2 className="fw-bold m-0">AI Gợi Ý Phim</h2>
                    <p className="m-0 text-white-50 small">Hỏi tôi bất cứ điều gì về phim...</p>
                </div>
            </div>

            <p className="lead fs-6 mb-4 text-light">
               Chào {user ? <strong>{user.name}</strong> : "bạn"}, hôm nay bạn muốn xem gì? 
               <br/><small className="opacity-75">("Phim gì vui vẻ cho cặp đôi?", "Phim hành động mới nhất?")</small>
            </p>

            <div className="position-relative">
                <input 
                    type="text" 
                    className="form-control form-control-lg rounded-pill pe-5 border-0 shadow"
                    placeholder="Nhập mong muốn của bạn..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                    style={{ fontSize: '1rem', padding: '15px 25px', background: 'rgba(255,255,255,0.9)' }}
                />
                <button 
                    className="btn btn-pink position-absolute end-0 translate-middle-y rounded-circle m-1 d-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: '45px', height: '45px', background: '#d63384', color: 'white', border: 'none', top: '44%' }}
                    onClick={handleAskAI}
                    disabled={loading}
                >
                    {loading ? <span className="spinner-border spinner-border-sm"></span> : <FaPaperPlane />}
                </button>
            </div>
          </div>

          {/* CỘT PHẢI: KẾT QUẢ GỢI Ý */}
          <div className="col-lg-7">
            {loading ? (
                <div className="text-center py-5">
                    <FaMagic className="mb-3 fa-spin text-pink" size={40} />
                    <h5>AI đang suy nghĩ...</h5>
                </div>
            ) : result ? (
                <div className="ai-results">
                    {/* Bong bóng chat của AI */}
                    <div className="bg-white text-dark p-3 rounded-3 mb-4 d-inline-block shadow-sm" style={{borderBottomLeftRadius: 0}}>
                        <FaRobot className="me-2 text-pink"/> 
                        {result.message}
                    </div>

                    {/* Danh sách phim gợi ý */}
                    <div className="row g-3">
                        {result.movies.map(movie => (
                            <div key={movie.id} className="col-4">
                                <div 
                                    className="card h-100 border-0 shadow-sm overflow-hidden cursor-pointer movie-card-hover"
                                    onClick={() => navigate(`/movie/${movie.id}`)}
                                >
                                    <div className="position-relative" style={{paddingTop: '150%'}}>
                                        <img 
                                            src={movie.poster_url} 
                                            alt={movie.title}
                                            className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
                                        />
                                        <div className="position-absolute bottom-0 start-0 w-100 p-2 text-white bg-dark bg-opacity-75 text-center">
                                            <small className="fw-bold d-block text-truncate">{movie.title}</small>
                                            <button className="btn btn-sm btn-pink p-0 px-2 mt-1" style={{fontSize: '10px'}}>
                                                <FaTicketAlt className="me-1"/> Đặt vé
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center text-white-50 py-5 border border-dashed rounded-3" style={{borderColor: 'rgba(255,255,255,0.2)'}}>
                    <FaMagic size={40} className="mb-3 opacity-50" />
                    <p>Kết quả gợi ý sẽ hiện ở đây</p>
                </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

export default AIRecommender;