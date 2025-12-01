import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function NowShowingComponent() {
  const navigate = useNavigate();
  const [nowShowing, setNowShowing] = useState([]);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount());
  const [startIndex, setStartIndex] = useState(0);
  const listRef = useRef(null);

  // 1. Cấu hình số lượng phim hiển thị
  function getVisibleCount() {
    const width = window.innerWidth;
    if (width < 576) return 1; // Mobile: Hiện 2 phim
    if (width < 768) return 2; // Tablet nhỏ: 3 phim
    if (width < 992) return 3; // Tablet lớn: 4 phim
    return 4; // PC: 4 phim
  }

  // 2. Logic Next/Prev đã sửa lỗi
  const handlePrev = () => setStartIndex((prev) => Math.max(prev - 1, 0));
  
  const handleNext = () => {
    // Chặn không cho index vượt quá số lượng phim thực tế
    setStartIndex((prev) => Math.min(prev + 1, nowShowing.length - visibleCount));
  };

  // 3. Tính toán style trượt
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
        // Reset index nếu resize làm lố phim
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
                    style={{ cursor: "pointer" }}
                >
                  <img
                    src={movie.poster || movie.poster_url}
                    alt={movie.title}
                    className="card-img-top"
                    style={{ height: "250px", objectFit: "cover" }}
                  />
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
    </div>
  );
}

export default NowShowingComponent;