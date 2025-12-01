import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Home.css";

// Import Component
import Banner from "../components/Banner";
import NowShowing from "../components/NowShowingComponent";
import UpcomingMovies from "../components/UpcomingComponent";
import ReviewHighlights from "../components/ReviewHighlights";
import PromotionSection from "../components/PromotionSection";
import BlogSection from "../components/BlogSection";
import AIRecommender from "../components/AIRecommender";

function Home() {
  const navigate = useNavigate();

  // === State Dữ Liệu ===
  const [nowShowing, setNowShowing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [theaters, setTheaters] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [blogs, setBlogs] = useState([]);

  // === State UI cho Lịch Chiếu ===
  const [selectedCity, setSelectedCity] = useState("HCM");
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [brandOpen, setBrandOpen] = useState({});
  
  // === State UI cho Blog ===
  const [visibleBlogCount, setVisibleBlogCount] = useState(4);

  // Helpers cho ngày tháng 
  const getNextSevenDays = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toLocaleDateString("en-CA"); 
      const day = date.getDate();
      const weekday = i === 0 ? "Hôm nay" : date.toLocaleDateString("vi-VN", { weekday: "short" });
      dates.push({ fullDate: dateString, day, weekday, isToday: i === 0 });
    }
    return dates;
  };

  const [availableDates] = useState(getNextSevenDays());
  const [selectedDateRaw, setSelectedDateRaw] = useState(availableDates[0].fullDate);

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nowRes, upRes, theaterRes, showRes, promoRes, blogRes] = await Promise.all([
          fetch("http://localhost:5000/api/movies/now_showing").then((res) => res.json()),
          fetch("http://localhost:5000/api/movies/upcoming").then((res) => res.json()),
          fetch("http://localhost:5000/api/theaters").then((res) => res.json()),
          fetch("http://localhost:5000/api/showtimes").then((res) => res.json()),
          fetch("http://localhost:5000/api/promotions").then((res) => res.json()),
          fetch("http://localhost:5000/api/blogs").then((res) => res.json()),
        ]);

        setNowShowing(nowRes);
        setUpcoming(upRes);
        setTheaters(theaterRes);
        setShowtimes(showRes);
        setPromotions(Array.isArray(promoRes) ? promoRes : []);
        setBlogs(Array.isArray(blogRes) ? blogRes : []);
      } catch (err) {
        console.error("Lỗi khi fetch dữ liệu home:", err);
      }
    };
    fetchData();
  }, []);

  // === Helpers ===
  const goToMovieDetail = (movieId) => navigate(`/movie/${movieId}`);
  
  const goToBlogDetail = (blogId) => {
    if (blogId) navigate(`/blog/${blogId}`);
  };

  const handleLoadMoreBlogs = () => {
    setVisibleBlogCount((prev) => prev + 4);
  };

  const toggleBrand = (brand) => {
    setBrandOpen((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const cityMap = {
    HCM: "TP.HCM", HN: "Hà Nội", DN: "Đà Nẵng", CT: "Cần Thơ", KH: "Khánh Hòa", Hue: "Huế",
  };

  // === Logic Xử lý Lịch Chiếu ===
  const filteredTheaters = useMemo(() => {
    return theaters.filter((t) =>
      selectedCity in cityMap 
        ? (t.location && t.location.includes(cityMap[selectedCity])) 
        : true
    );
  }, [theaters, selectedCity]);

  const theaterGroups = useMemo(() => {
      return filteredTheaters.reduce((acc, theater) => {
        const brand = theater.name.split(" ")[0];
        if (!acc[brand]) acc[brand] = [];
        acc[brand].push(theater);
        return acc;
      }, {});
  }, [filteredTheaters]);

  useEffect(() => {
    if (filteredTheaters.length > 0) {
        const currentExists = filteredTheaters.find(t => t.id === selectedTheater?.id);
        if (!currentExists) {
            setSelectedTheater(filteredTheaters[0]);
        }
    } else {
        setSelectedTheater(null);
    }
  }, [filteredTheaters, selectedTheater]);

  const groupedMovies = useCallback(() => {
    if (!selectedTheater || !selectedDateRaw || !showtimes.length) return [];
    
    // 1. Lọc suất chiếu
    const filtered = showtimes.filter((s) => {
      const showDateLocal = new Date(s.show_date).toLocaleDateString("en-CA"); 
      const isTheaterMatch = (s.theater_id && selectedTheater.id) 
          ? s.theater_id == selectedTheater.id 
          : s.theater === selectedTheater.name;

      return isTheaterMatch && showDateLocal === selectedDateRaw;
    });

    // 2. Map suất chiếu vào Phim
    const grouped = filtered.reduce((acc, s) => {
      const movie =
        nowShowing.find((m) => (s.movie_id && m.id == s.movie_id) || (s.movie && m.title === s.movie)) ||
        upcoming.find((m) => (s.movie_id && m.id == s.movie_id) || (s.movie && m.title === s.movie));
      
      if (!movie) return acc;

      if (!acc[movie.id]) acc[movie.id] = { ...movie, formats: {} };
      const formatKey = s.format || "2D Phụ đề";
      if (!acc[movie.id].formats[formatKey]) acc[movie.id].formats[formatKey] = [];
      
      // Format giờ HH:MM
      const timeFormatted = s.show_time.toString().slice(0, 5);
      
      acc[movie.id].formats[formatKey].push({ time: timeFormatted, id: s.id });
      return acc;
    }, {});

    const result = Object.values(grouped);
    result.forEach(movie => {
        Object.values(movie.formats).forEach(timeList => {
            timeList.sort((a, b) => a.time.localeCompare(b.time));
        });
    });
    return result;
  }, [selectedTheater, selectedDateRaw, showtimes, nowShowing, upcoming]);

  const moviesForSchedule = groupedMovies();

  const getDayInfo = (d) => {
     return d; 
  };

  return (
    <div className="container-fluid px-0 home-container">
      <Banner />
      <AIRecommender />
      <NowShowing movies={nowShowing} goToMovieDetail={goToMovieDetail} />
      <UpcomingMovies movies={upcoming} goToMovieDetail={goToMovieDetail} />

      {/* --- SECTION: LỊCH CHIẾU-- */}
      <section className="container my-5 p-4" id="showtimes">
        {/* Tiêu đề cũ */}
        <h2 className="mb-4 text-center text-pink fw-bold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.1)'}}>
             Lịch Chiếu Phim
        </h2>
        
        <div className="row g-0 bg-white rounded overflow-hidden">
          {/* Cột chọn rạp  */}
          <div className="col-12 col-md-3 border-end mb-3 mb-md-0 pe-md-3">
            <select
              className="form-select form-select-sm mb-3 shadow-sm border-pink fw-bold text-pink"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              {Object.entries(cityMap).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>

            <div style={{ maxHeight: "500px", overflowY: "auto" }} className="custom-scrollbar pe-1">
              {Object.entries(theaterGroups).map(([brand, theaters]) => (
                <div key={brand} className="mb-2">
                  <div
                    className="brand-item p-2 rounded d-flex justify-content-between align-items-center cursor-pointer bg-light"
                    onClick={() => toggleBrand(brand)}
                  >
                    <div className="d-flex align-items-center">
                        <img
                            src={theaters[0].brand_logo || "/logo_theaters/default.png"}
                            alt={brand}
                            style={{ width: 40, height: 40, objectFit: "contain", marginRight: 8 }}
                            onError={(e) => {e.target.onerror = null; e.target.src="https://via.placeholder.com/40"}}
                        />
                        <strong>{brand}</strong>
                    </div>
                    <span>{brandOpen[brand] ? <i className="fas fa-chevron-up text-pink"></i> : <i className="fas fa-chevron-down text-muted"></i>}</span>
                  </div>

                  {brandOpen[brand] &&
                    theaters.map((t) => (
                      <div
                        key={t.id}
                        className={`theater-item p-2 ms-2 mb-1 mt-1 rounded cursor-pointer ${selectedTheater?.id === t.id ? "active" : ""}`}
                        onClick={() => setSelectedTheater(t)}
                      >
                        <strong className={selectedTheater?.id === t.id ? "text-pink" : "text-dark"}>{t.name}</strong>
                        <p className="small text-muted mb-0 text-truncate">{t.location}</p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Cột lịch chiếu */}
          <div className="col-12 col-md-9 ps-md-4 pt-2">
            {selectedTheater ? (
              <>
                {/* Thanh chọn ngày */}
                <div className="date d-flex flex-nowrap overflow-x-auto mb-4 pb-2" style={{gap: '12px'}}>
                  {availableDates.map((dObj) => {
                    const isActive = selectedDateRaw === dObj.fullDate;
                    return (
                      <div
                        key={dObj.fullDate}
                        className={`date-item p-2 text-center cursor-pointer ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedDateRaw(dObj.fullDate)}
                        style={{ minWidth: 75 }}
                      >
                        {/* SỬA LẠI TÊN BIẾN Ở ĐÂY */}
                        <div className="fw-bold fs-5">{dObj.day}</div> 
                        <div className="small fw-bold text-uppercase">{dObj.weekday}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="movie-schedule-vertical pe-2 custom-scrollbar" style={{ maxHeight: 600, overflowY: "auto" }}>
                  {moviesForSchedule.length === 0 ? (
                    <div className="text-center text-muted py-5">
                        <i className="fas fa-film fa-3x mb-3 text-pink opacity-50"></i>
                        <h5>Không có suất chiếu nào cho ngày này tại {selectedTheater.name}.</h5>
                        <p className="small">Vui lòng chọn ngày khác hoặc rạp khác.</p>
                    </div>
                  ) : (
                    moviesForSchedule.map((movie) => (
                      <div
                        key={movie.id}
                        className="movie-row mb-4 p-3 d-flex flex-column flex-md-row align-items-start"
                      >
                        <div 
                            className="me-0 me-md-4 mb-3 mb-md-0 flex-shrink-0"
                            onClick={() => goToMovieDetail(movie.id)}
                            style={{cursor: 'pointer'}}
                        >
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="rounded movie-thumb"
                            style={{ width: 130, height: 185, objectFit: "cover" }}
                            onError={(e) => {e.target.onerror = null; e.target.src="https://via.placeholder.com/130x185"}}
                          />
                        </div>

                        <div className="flex-grow-1 pt-1">
                          <h4 
                            className="fw-bold mb-2 text-pink cursor-pointer"
                            onClick={() => goToMovieDetail(movie.id)}
                          >{movie.title}</h4>
                          <p className="small text-muted mb-3 line-clamp-2">{movie.description || "Đang cập nhật mô tả..."}</p>

                          {Object.entries(movie.formats).map(([format, timeData]) => (
                            <div key={format} className="mb-3">
                              <span className="format-badge mb-2 d-inline-block">{format}</span>
                              <div className="d-flex flex-wrap gap-3 mt-2">
                                {timeData.map((item, idx) => (
                                  <button 
                                    key={idx} 
                                    className="btn btn-sm time-btn px-3 py-2" 
                                    style={{ minWidth: 85 }} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.id && movie.id) {
                                          navigate(`/booking?showtimeId=${item.id}&movieId=${movie.id}`);
                                        }
                                    }}
                                  >
                                    {item.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-5 text-muted h-100 d-flex flex-column justify-content-center align-items-center">
                  <i className="fas fa-store-alt fa-4x mb-3 text-pink opacity-50"></i>
                  <h4>Vui lòng chọn một rạp để xem lịch chiếu</h4>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- SECTION: KHUYẾN MÃI --- */}
      <PromotionSection promotions={promotions} />

      {/* --- SECTION: BLOG ĐIỆN ẢNH --- */}
      <BlogSection blogs={blogs} />

      <section className="container my-5">
        <h2 className="text-center text-pink fw-bold mb-4">Bình Luận Nổi Bật</h2>
        <ReviewHighlights limit={10} />
      </section>
    </div>
  );
}

export default Home;