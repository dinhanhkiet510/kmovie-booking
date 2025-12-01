import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function UpcomingComponent() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  
  // Khởi tạo state với giá trị tính toán ngay lập tức
  const [visibleCount, setVisibleCount] = useState(getVisibleCount());
  const [startIndex, setStartIndex] = useState(0);
  const listRef = useRef(null);

  // 1. Cấu hình số lượng 
  function getVisibleCount() {
    const width = window.innerWidth;
    if (width < 576) return 1; // Mobile: Hiện 2 phim
    if (width < 768) return 2; // Tablet nhỏ: 3 phim
    if (width < 992) return 3; // Tablet lớn: 3 phim 
    return 4; // PC: 4 phim
  }

  // 2. Logic Prev/Next
  const handlePrev = () => setStartIndex((prev) => Math.max(prev - 1, 0));
  
  const handleNext = () => {
    setStartIndex((prev) => Math.min(prev + 1, upcoming.length - visibleCount));
  };

  // 3. Tính toán chiều rộng item động
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

  // Logic disable nút
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
    </section>
  );
}

export default UpcomingComponent;