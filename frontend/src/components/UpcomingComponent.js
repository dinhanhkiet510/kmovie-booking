import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function UpcomingComponent() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  
  // State cho Trailer Modal
  const [playingTrailer, setPlayingTrailer] = useState(null); // Lưu URL trailer đang phát

  // Khởi tạo state với giá trị tính toán ngay lập tức
  const [visibleCount, setVisibleCount] = useState(getVisibleCount());
  const [startIndex, setStartIndex] = useState(0);
  const listRef = useRef(null);

  // 1. Cấu hình số lượng 
  function getVisibleCount() {
    const width = window.innerWidth;
    if (width < 576) return 1; 
    if (width < 768) return 2; 
    if (width < 992) return 3; 
    return 4; 
  }

  // --- Xử lý link YouTube ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = "";
    // Regex bắt ID video youtube
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  // --- Mở/Đóng Trailer ---
  const handleOpenTrailer = (e, url) => {
    e.stopPropagation();
    if (url) {
      setPlayingTrailer(getEmbedUrl(url));
    } else {
      alert("Phim này chưa cập nhật trailer!");
    }
  };

  const handleCloseTrailer = () => {
    setPlayingTrailer(null);
  };

  // 2. Logic Prev/Next
  const handlePrev = () => setStartIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () => {
    setStartIndex((prev) => Math.min(prev + 1, upcoming.length - visibleCount));
  };

  const itemWidth = 100 / visibleCount;

  const getTransformStyle = {
    transform: `translateX(-${startIndex * itemWidth}%)`,
    transition: "transform 0.5s ease-in-out",
    display: "flex",
    width: "100%",
  };

  const goToMovieDetail = (id) => navigate(`/movie/${id}`);

  useEffect(() => {
    const handleResize = () => {
      const newCount = getVisibleCount();
      setVisibleCount(newCount);
      setStartIndex((prev) => Math.min(prev, Math.max(0, upcoming.length - newCount)));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [upcoming.length]);

  useEffect(() => {
    fetch("http://localhost:5000/api/movies/upcoming")
      .then((res) => res.json())
      .then(setUpcoming)
      .catch(console.error);
  }, []);

  const isPrevDisabled = startIndex <= 0;
  const isNextDisabled = startIndex >= upcoming.length - visibleCount;

  return (
    <section className="container" style={{ marginTop: "50px", marginBottom: "3rem" }}>
      <h2 className="mb-4 text-pink fw-bold text-center">Phim Sắp Chiếu</h2>

      <div className="position-relative overflow-hidden px-2">
        {/* Container danh sách phim */}
        <div className="d-flex" style={getTransformStyle} ref={listRef}>
          {upcoming.map((movie) => (
            <div
              key={movie.id}
              style={{ 
                flex: `0 0 ${itemWidth}%`, 
                maxWidth: `${itemWidth}%`,
                padding: "0 10px" 
              }}
              onClick={() => goToMovieDetail(movie.id)}
            >
              <div 
                className="card h-100 shadow-sm border-0 hover-scale"
                style={{ cursor: "pointer", position: 'relative' }} // Thêm relative để định vị nút play
              >
                {/* --- Nút Play đè lên ảnh --- */}
                <div className="position-relative">
                   <img
                    src={movie.poster || movie.poster_url}
                    alt={movie.title}
                    className="card-img-top"
                    style={{ height: "250px", objectFit: "cover" }}
                  />
                  {/* Overlay mờ khi hover hoặc luôn hiện nút play nhỏ */}
                  <div 
                    className="position-absolute top-50 start-50 translate-middle"
                    style={{ zIndex: 10 }}
                    onClick={(e) => handleOpenTrailer(e, movie.trailer_url)}
                  >
                    <style>{`
                      .btn-glass {
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.2); /* Màu trắng trong suốt */
                        backdrop-filter: blur(8px); /* Hiệu ứng làm mờ nền */
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        cursor: pointer;
                      }
                      .btn-glass:hover {
                        background: rgba(255, 53, 122, 0.8); /* Màu hồng chủ đạo của bạn khi hover */
                        transform: scale(1.15);
                        border-color: transparent;
                        box-shadow: 0 0 20px rgba(255, 53, 122, 0.6);
                      }
                      .play-icon {
                        width: 0; 
                        height: 0; 
                        border-top: 10px solid transparent;
                        border-bottom: 10px solid transparent;
                        border-left: 16px solid white; /* Tam giác nút play */
                        margin-left: 4px; /* Căn chỉnh lại chút cho cân giữa */
                      }
                    `}</style>
                    <div className="btn-glass">
                      <div className="play-icon"></div>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <h5 className="card-title text-truncate">{movie.title}</h5>
                  <p className="card-text text-truncate">{movie.description}</p>
                  
                  {/* Rating + Nút Trailer dạng text (Optional) */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <span className="text-warning me-1" style={{ fontSize: '1.1rem' }}>★</span> 
                      <span className="fw-bold text-dark">{movie.rating || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Nút điều hướng */}
        <button
          className="nav-btn position-absolute top-50 start-0 translate-middle-y"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          style={{ zIndex: 10}}
        >
          &#8249;
        </button>
        <button
          className="nav-btn position-absolute top-50 end-0 translate-middle-y"
          onClick={handleNext}
          disabled={isNextDisabled}
          style={{ zIndex: 10 }}
        >
          &#8250;
        </button>
      </div>

      {/* ---  Modal Trailer --- */}
      {playingTrailer && (
        <div 
          className="modal-backdrop-custom"
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1050,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onClick={handleCloseTrailer} // Click ra ngoài thì đóng
        >
          <div 
            className="modal-content-custom position-relative bg-black"
            style={{ width: '80%', maxWidth: '800px', aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()} // Click vào video không đóng
          >
            <button 
              className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
              style={{ zIndex: 1060 }}
              onClick={handleCloseTrailer}
            ></button>
            <iframe
              width="100%"
              height="100%"
              src={playingTrailer}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

    </section>
  );
}

export default UpcomingComponent;