import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function NowShowingComponent() {
  const navigate = useNavigate();
  const [nowShowing, setNowShowing] = useState([]);
  
  // State cho Trailer Modal
  const [playingTrailer, setPlayingTrailer] = useState(null);

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

  // --- LOGIC XỬ LÝ LINK TRAILER ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = "";
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
    setStartIndex((prev) => Math.min(prev + 1, nowShowing.length - visibleCount));
  };

  // 3. Style
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
      setStartIndex((prev) => Math.min(prev, Math.max(0, nowShowing.length - newCount)));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [nowShowing.length]);

  useEffect(() => {
    fetch("http://localhost:5000/api/movies/now_showing")
      .then((res) => res.json())
      .then(setNowShowing)
      .catch(console.error);
  }, []);

  return (
    <div style={{ backgroundColor: "black" }}>
      <section
        className="container"
        style={{
          height: "650px",
          backgroundImage: "url(/background/background_phimdangchieu.png)", 
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          position: "relative"
        }}
      >
        <h2 className="mb-5 fw-bold text-center text-white" style={{ paddingTop: "30px" }}>
          Phim Đang Chiếu
        </h2>

        <div className="position-relative overflow-hidden px-2">
          {/* Container danh sách phim */}
          <div className="d-flex" style={getTransformStyle} ref={listRef}>
            {nowShowing.map((movie) => (
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
                    style={{ cursor: "pointer", position: "relative" }}
                >
                  <div className="position-relative">
                    <img
                        src={movie.poster || movie.poster_url}
                        alt={movie.title}
                        className="card-img-top"
                        style={{ height: "250px", objectFit: "cover" }}
                    />
                    
                    {/* --- THAY THẾ NÚT ĐỎ BẰNG NÚT KÍNH MỜ (GLASS) --- */}
                    <div 
                        className="position-absolute top-50 start-50 translate-middle"
                        style={{ zIndex: 10 }}
                        onClick={(e) => handleOpenTrailer(e, movie.trailer_url)}
                    >
                        {/* CSS nhúng trực tiếp cho gọn */}
                        <style>{`
                        .btn-glass {
                            width: 60px;
                            height: 60px;
                            border-radius: 50%;
                            background: rgba(255, 255, 255, 0.2);
                            backdrop-filter: blur(8px);
                            border: 1px solid rgba(255, 255, 255, 0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                            cursor: pointer;
                        }
                        .btn-glass:hover {
                            background: rgba(255, 53, 122, 0.8);
                            transform: scale(1.15);
                            border-color: transparent;
                            box-shadow: 0 0 20px rgba(255, 53, 122, 0.6);
                        }
                        .play-icon {
                            width: 0; 
                            height: 0; 
                            border-top: 10px solid transparent;
                            border-bottom: 10px solid transparent;
                            border-left: 16px solid white;
                            margin-left: 4px;
                        }
                        `}</style>
                        <div className="btn-glass">
                            <div className="play-icon"></div>
                        </div>
                    </div>
                    {/* --- KẾT THÚC PHẦN NÚT --- */}

                  </div>

                  <div className="card-body">
                    <h5 className="card-title text-truncate">{movie.title}</h5>
                    <p className="card-text text-truncate">{movie.description}</p>
                    <div className="mb-2 d-flex align-items-center">
                      <span className="text-warning me-1" style={{ fontSize: '1.1rem' }}>★</span> 
                      <span className="fw-bold text-dark">{movie.rating || 0}</span>
                      <span className="text-muted small ms-1">/5</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nút điều hướng */}
          <button
            className="nav-btn position-absolute top-50 start-0 translate-middle-y ms-2"
            onClick={handlePrev}
            disabled={startIndex <= 0}
            style={{zIndex: 10}}
          >
            &#8249;
          </button>
          <button
            className="nav-btn position-absolute top-50 end-0 translate-middle-y me-2"
            onClick={handleNext}
            disabled={startIndex >= nowShowing.length - visibleCount}
            style={{zIndex: 10}}
          >
            &#8250;
          </button>
        </div>
      </section>

      {/* --- MODAL TRAILER (Phải có đoạn này mới xem được) --- */}
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
          onClick={handleCloseTrailer}
        >
          <div 
            className="modal-content-custom position-relative bg-black"
            style={{ width: '80%', maxWidth: '800px', aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}

export default NowShowingComponent;