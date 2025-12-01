import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReviewSection from "../components/ReviewSection";
import "../css/Home.css"; // Import CSS của Home để lấy hiệu ứng đẹp
import "../css/MovieDetails.css";

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [theaters, setTheaters] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [nowShowingMovies, setNowShowingMovies] = useState([]);

  const [selectedCity, setSelectedCity] = useState("HCM");
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [brandOpen, setBrandOpen] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDateRaw, setSelectedDateRaw] = useState("");

  // Lấy dữ liệu movie, theaters, showtimes
  useEffect(() => {
    fetch(`http://localhost:5000/api/movies/${id}`)
      .then((res) => res.json())
      .then(setMovie)
      .catch(console.error);

    fetch("http://localhost:5000/api/theaters")
      .then((res) => res.json())
      .then(setTheaters)
      .catch(console.error);

    fetch("http://localhost:5000/api/showtimes")
      .then((res) => res.json())
      .then(setShowtimes) 
      .catch(console.error);

    fetch("http://localhost:5000/api/movies/now_showing")
      .then((res) => res.json())
      .then(setNowShowingMovies)
      .catch(console.error);
  }, [id]);

  // Filter rạp theo thành phố
  const filteredTheaters = theaters.filter((t) => {
    const mapCity = {
        "HCM": "TP.HCM", "HN": "Hà Nội", "DN": "Đà Nẵng", 
        "CT": "Cần Thơ", "KH": "Khánh Hòa"
    };
    return t.location && mapCity[selectedCity] ? t.location.includes(mapCity[selectedCity]) : true;
  });

  // Set rạp mặc định
  useEffect(() => {
    if (!selectedTheater && filteredTheaters.length > 0) {
      setSelectedTheater(filteredTheaters[0]);
    }
  }, [filteredTheaters, selectedTheater]);

  const toggleBrand = (brand) => {
    setBrandOpen((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const getNextSevenDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  useEffect(() => {
    setAvailableDates(getNextSevenDays());
    setSelectedDateRaw(new Date().toISOString().split("T")[0]);
  }, []);

  const getDayInfo = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const weekday = date.toLocaleDateString("vi-VN", { weekday: "short" });
    return { day, weekday };
  };

  // Nhóm lịch chiếu theo format
  const groupedShowtimes =
    movie && selectedTheater
      ? showtimes
          .filter((s) => {
            if (s.movie !== movie.title || s.theater !== selectedTheater.name)
              return false;
            const utcDate = new Date(s.show_date);
            const localDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
            const localDateString = localDate.toISOString().split("T")[0];
            return localDateString === selectedDateRaw;
          })
          .reduce((acc, s) => {
            const format = s.format || "2D Phụ đề";
            if (!acc[format]) acc[format] = [];
            acc[format].push(s); 
            return acc;
          }, {})
      : {};

  // Nhóm rạp theo brand
  const theaterGroups = filteredTheaters.reduce((acc, theater) => {
    const brand = theater.name.split(" ")[0];
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(theater);
    return acc;
  }, {});

  return (
    <div className="container-fluid bg-white">
      {movie && (
        <>
          {/* Thông tin phim */}
          <div
            className="row mb-4 p-3 text-white align-items-center mx-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.6)), url(${movie.poster})`, // Dùng poster làm nền mờ luôn cho đẹp
              backgroundSize: "cover",
              backgroundPosition: "center",
              minHeight: "400px"
            }}
          >
            {/* Poster */}
            <div className="col-md-3 mb-3 mb-md-0 text-center">
              <img
                src={movie.poster}
                alt={movie.title}
                className="img-fluid rounded shadow-lg"
                style={{ height: "350px", objectFit: "cover", border: "2px solid white" }}
              />
            </div>

            {/* Thông tin chi tiết */}
            <div className="col-md-9">
              <h2 className="fw-bold mb-3 text-uppercase">{movie.title}</h2>
              <div className="d-flex gap-3 mb-3 text-light opacity-75 small">
                 <span><i className="fas fa-calendar-alt"></i> {movie.production_year}</span>
                 <span><i className="fas fa-clock"></i> {movie.duration} phút</span>
                 <span><i className="fas fa-star text-warning"></i> {movie.rating}/10</span>
                 <span className="border px-2 rounded">{movie.age || "16+"}</span>
              </div>
              
              <p className="text-light mb-4" style={{ lineHeight: "1.6" }}>
                {movie.description}
              </p>

              <div className="d-flex gap-3">
                {movie.trailer_url && (
                  <a
                    href={movie.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-pink rounded-pill px-4 py-2 fw-bold shadow"
                  >
                    <i className="fas fa-play me-2"></i> Xem Trailer
                  </a>
                )}
                <button className="btn btn-outline-light rounded-pill px-4 py-2 fw-bold">
                    Đánh giá
                </button>
              </div>
            </div>
          </div>

          {/* Lịch chiếu + Phim đang chiếu */}
          <div className="container my-5">
            <div className="row g-4">
              
              {/* CỘT TRÁI: LỊCH CHIẾU (Đã design lại giống Home) */}
              <div className="col-12 col-lg-8">
                <h3 className="mb-4 border-start border-4 border-pink ps-3 fw-bold text-dark">
                    Lịch Chiếu Phim
                </h3>

                {/* Khung chọn Rạp & Ngày */}
                <div className="p-3 rounded bg-white shadow-sm border">
                    
                    {/* Chọn thành phố & Rạp */}
                    <div className="row g-2 mb-4">
                        <div className="col-12 col-md-4">
                            <select
                                className="form-select shadow-sm border-pink fw-bold text-pink"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                            >
                                <option value="HCM">Hồ Chí Minh</option>
                                <option value="HN">Hà Nội</option>
                                <option value="DN">Đà Nẵng</option>
                                <option value="CT">Cần Thơ</option>
                                <option value="KH">Khánh Hòa</option>
                            </select>
                            
                            {/* Danh sách Rạp (Style Home) */}
                            <div className="mt-2 custom-scrollbar" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                {Object.entries(theaterGroups).map(([brand, theaters]) => (
                                    <div key={brand} className="mb-1">
                                        <div
                                            className="brand-item p-2 rounded d-flex justify-content-between align-items-center cursor-pointer bg-light mb-1"
                                            onClick={() => toggleBrand(brand)}
                                        >
                                            <div className="d-flex align-items-center">
                                                <img
                                                    src={theaters[0].brand_logo || "/logo_theaters/default.png"}
                                                    alt={brand}
                                                    style={{ width: "30px", height: "30px", objectFit: "contain", marginRight: "8px" }}
                                                />
                                                <strong style={{fontSize: '0.9rem'}}>{brand}</strong>
                                            </div>
                                            <i className={`fas fa-chevron-${brandOpen[brand] ? 'up' : 'down'} text-muted small`}></i>
                                        </div>
                                        
                                        {brandOpen[brand] && (
                                            <div className="ps-2 border-start border-pink ms-2">
                                                {theaters.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className={`theater-item p-2 mb-1 rounded cursor-pointer small ${
                                                            selectedTheater?.id === t.id ? "active" : ""
                                                        }`}
                                                        onClick={() => setSelectedTheater(t)}
                                                    >
                                                        {t.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cột bên phải: Ngày & Giờ chiếu */}
                        <div className="col-12 col-md-8 ps-md-3">
                            {selectedTheater ? (
                                <>
                                    {/* Chọn ngày (Style Home) */}
                                    <div className="d-flex flex-nowrap overflow-x-auto mb-3 gap-2 pb-2 custom-scrollbar">
                                        {availableDates.map((d) => {
                                            const info = getDayInfo(d);
                                            const isActive = selectedDateRaw === d;
                                            return (
                                                <div
                                                    key={d}
                                                    className={`date-item p-2 text-center cursor-pointer ${isActive ? "active" : ""}`}
                                                    onClick={() => setSelectedDateRaw(d)}
                                                    style={{ minWidth: "70px" }}
                                                >
                                                    <div className="fw-bold fs-5">{info.day}</div>
                                                    <div className="small text-uppercase fw-bold">{info.weekday}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Giờ chiếu (Style Home) */}
                                    <div className="movie-schedule-vertical" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                        {Object.keys(groupedShowtimes).length === 0 ? (
                                            <div className="text-center py-4 text-muted">
                                                <i className="fas fa-film fa-2x mb-2 text-pink opacity-50"></i>
                                                <p>Chưa có lịch chiếu.</p>
                                            </div>
                                        ) : (
                                            Object.entries(groupedShowtimes).map(([format, times]) => (
                                                <div key={format} className="mb-3">
                                                    <span className="badge bg-dark text-white mb-2 px-3 py-1 rounded-pill shadow-sm">
                                                        {format}
                                                    </span>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {times.map((s) => (
                                                            <button
                                                                key={s.id}
                                                                className="btn btn-sm time-btn px-3 py-2"
                                                                style={{ minWidth: "85px" }}
                                                                onClick={() => navigate(`/booking?showtimeId=${s.id}&movieId=${movie.id}`)}
                                                            >
                                                                {s.show_time.toString().slice(0,5)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-5 text-muted border rounded bg-light h-100 d-flex flex-column justify-content-center align-items-center">
                                    <i className="fas fa-store-alt fa-3x mb-3 text-pink opacity-50"></i>
                                    <h5>Vui lòng chọn rạp</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>

              {/* CỘT PHẢI: PHIM ĐANG CHIẾU (Side bar) */}
              <div className="col-12 col-lg-4">
                <h5 className="mb-3 border-bottom border-pink pb-2 text-pink fw-bold">
                    PHIM ĐANG CHIẾU
                </h5>
                <div className="d-flex flex-column gap-3" style={{ maxHeight: "700px", overflowY: "auto" }}>
                  {nowShowingMovies.map((m) => (
                    <div
                      key={m.id}
                      className="d-flex p-2 rounded bg-white shadow-sm border movie-side-card"
                      style={{ cursor: "pointer", transition: "transform 0.2s" }}
                      onClick={() => navigate(`/movie/${m.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      <img
                        src={m.poster_url || "/poster_placeholder.png"}
                        alt={m.title}
                        className="rounded"
                        style={{ width: "70px", height: "100px", objectFit: "cover", marginRight: "12px" }}
                      />
                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-1 text-dark">{m.title}</h6>
                        <p className="small text-muted mb-1">{m.genre || "Hành động, Phiêu lưu"}</p>
                        <span className="badge bg-warning text-dark">
                            <i className="fas fa-star me-1"></i>{m.rating || 8.5}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
      <ReviewSection movieId={id} />
    </div>
  );
}

export default MovieDetail;