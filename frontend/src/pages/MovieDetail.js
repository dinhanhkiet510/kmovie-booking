import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReviewSection from "../components/ReviewSection";
import "../css/Home.css"; 
import "../css/MovieDetails.css";

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const reviewRef = useRef(null);

  const [movie, setMovie] = useState(null);
  const [theaters, setTheaters] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [nowShowingMovies, setNowShowingMovies] = useState([]);
  const [playingTrailer, setPlayingTrailer] = useState(null);

  const [selectedCity, setSelectedCity] = useState("HCM");
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [brandOpen, setBrandOpen] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDateRaw, setSelectedDateRaw] = useState("");

  // --- LOGIC CUỘN XUỐNG ĐÁNH GIÁ ---
  const handleScrollToReviews = () => {
    // Kiểm tra nếu ref tồn tại thì cuộn xuống
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- LOGIC XỬ LÝ LINK YOUTUBE ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) videoId = match[2];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  const handleOpenTrailer = () => {
    if (movie && movie.trailer_url) setPlayingTrailer(getEmbedUrl(movie.trailer_url));
    else alert("Phim này chưa có trailer!");
  };

  const handleCloseTrailer = () => setPlayingTrailer(null);

  // FETCH API (Giữ nguyên)
  useEffect(() => {
    fetch(`http://localhost:5000/api/movies/${id}`).then((res) => res.json()).then(setMovie).catch(console.error);
    fetch("http://localhost:5000/api/theaters").then((res) => res.json()).then(setTheaters).catch(console.error);
    fetch("http://localhost:5000/api/showtimes").then((res) => res.json()).then(setShowtimes).catch(console.error);
    fetch("http://localhost:5000/api/movies/now_showing").then((res) => res.json()).then(setNowShowingMovies).catch(console.error);
  }, [id]);

  // Filter & Logic ngày tháng (Giữ nguyên)
  const filteredTheaters = theaters.filter((t) => {
    const mapCity = { "HCM": "TP.HCM", "HN": "Hà Nội", "DN": "Đà Nẵng", "CT": "Cần Thơ", "KH": "Khánh Hòa" };
    return t.location && mapCity[selectedCity] ? t.location.includes(mapCity[selectedCity]) : true;
  });

  useEffect(() => {
    if (!selectedTheater && filteredTheaters.length > 0) setSelectedTheater(filteredTheaters[0]);
  }, [filteredTheaters, selectedTheater]);

  const toggleBrand = (brand) => setBrandOpen((prev) => ({ ...prev, [brand]: !prev[brand] }));

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
    return { day: date.getDate(), weekday: date.toLocaleDateString("vi-VN", { weekday: "short" }) };
  };

  const groupedShowtimes = movie && selectedTheater ? showtimes.filter((s) => {
    if (s.movie !== movie.title || s.theater !== selectedTheater.name) return false;
    const utcDate = new Date(s.show_date);
    const localDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
    return localDate.toISOString().split("T")[0] === selectedDateRaw;
  }).reduce((acc, s) => {
    const format = s.format || "2D Phụ đề";
    if (!acc[format]) acc[format] = [];
    acc[format].push(s); 
    return acc;
  }, {}) : {};

  const theaterGroups = filteredTheaters.reduce((acc, theater) => {
    const brand = theater.name.split(" ")[0];
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(theater);
    return acc;
  }, {});

  return (
    <div className="container-fluid bg-white position-relative">
      {movie && (
        <>
          {/* Header Phim */}
          <div
            className="row mb-4 p-3 text-white align-items-center mx-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.6)), url(${movie.poster})`, 
              backgroundSize: "cover", backgroundPosition: "center", minHeight: "400px"
            }}
          >
            <div className="col-md-3 mb-3 mb-md-0 text-center">
              <div className="position-relative d-inline-block">
                <img src={movie.poster} alt={movie.title} className="img-fluid rounded shadow-lg" style={{ height: "350px", objectFit: "cover", border: "2px solid white" }} />
                 <div className="position-absolute top-50 start-50 translate-middle" style={{ cursor: 'pointer' }} onClick={handleOpenTrailer}>
                    <i className="fas fa-play-circle text-white opacity-75 hover-opacity-100" style={{ fontSize: '4rem', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}></i>
                 </div>
              </div>
            </div>

            <div className="col-md-9">
              <h2 className="fw-bold mb-3 text-uppercase">{movie.title}</h2>
              <div className="d-flex gap-3 mb-3 text-light opacity-75 small">
                  <span><i className="fas fa-calendar-alt"></i> {movie.production_year}</span>
                  <span><i className="fas fa-clock"></i> {movie.duration} phút</span>
                  <span><i className="fas fa-star text-warning"></i> {movie.rating}/10</span>
                  <span className="border px-2 rounded">{movie.age || "16+"}</span>
              </div>
              <p className="text-light mb-4" style={{ lineHeight: "1.6" }}>{movie.description}</p>

              <div className="d-flex gap-3">
                <button onClick={handleOpenTrailer} className="btn btn-pink rounded-pill px-4 py-2 fw-bold shadow">
                  <i className="fas fa-play me-2"></i> Xem Trailer
                </button>
                
                {/* --- 3. GẮN SỰ KIỆN SCROLL VÀO NÚT NÀY --- */}
                <button 
                  className="btn btn-outline-light rounded-pill px-4 py-2 fw-bold"
                  onClick={handleScrollToReviews}
                >
                    Đánh giá
                </button>
              </div>
            </div>
          </div>

          {/* Body: Lịch chiếu & Sidebar */}
          <div className="container my-5">
            <div className="row g-4">
              {/* Lịch chiếu */}
              <div className="col-12 col-lg-8">
                <h3 className="mb-4 border-start border-4 border-pink ps-3 fw-bold text-dark">Lịch Chiếu Phim</h3>
                <div className="p-3 rounded bg-white shadow-sm border">
                    <div className="row g-2 mb-4">
                        <div className="col-12 col-md-4">
                            <select className="form-select shadow-sm border-pink fw-bold text-pink" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                                <option value="HCM">Hồ Chí Minh</option>
                                <option value="HN">Hà Nội</option>
                                <option value="DN">Đà Nẵng</option>
                                <option value="CT">Cần Thơ</option>
                                <option value="KH">Khánh Hòa</option>
                            </select>
                            <div className="mt-2 custom-scrollbar" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                {Object.entries(theaterGroups).map(([brand, theaters]) => (
                                    <div key={brand} className="mb-1">
                                        <div className="brand-item p-2 rounded d-flex justify-content-between align-items-center cursor-pointer bg-light mb-1" onClick={() => toggleBrand(brand)}>
                                            <div className="d-flex align-items-center">
                                                <img src={theaters[0].brand_logo || "/logo_theaters/default.png"} alt={brand} style={{ width: "30px", height: "30px", objectFit: "contain", marginRight: "8px" }} />
                                                <strong style={{fontSize: '0.9rem'}}>{brand}</strong>
                                            </div>
                                            <i className={`fas fa-chevron-${brandOpen[brand] ? 'up' : 'down'} text-muted small`}></i>
                                        </div>
                                        {brandOpen[brand] && (
                                            <div className="ps-2 border-start border-pink ms-2">
                                                {theaters.map((t) => (
                                                    <div key={t.id} className={`theater-item p-2 mb-1 rounded cursor-pointer small ${selectedTheater?.id === t.id ? "active" : ""}`} onClick={() => setSelectedTheater(t)}>
                                                        {t.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="col-12 col-md-8 ps-md-3">
                            {selectedTheater ? (
                                <>
                                    <div className="d-flex flex-nowrap overflow-x-auto mb-3 gap-2 pb-2 custom-scrollbar">
                                        {availableDates.map((d) => {
                                            const info = getDayInfo(d);
                                            return (
                                                <div key={d} className={`date-item p-2 text-center cursor-pointer ${selectedDateRaw === d ? "active" : ""}`} onClick={() => setSelectedDateRaw(d)} style={{ minWidth: "70px" }}>
                                                    <div className="fw-bold fs-5">{info.day}</div>
                                                    <div className="small text-uppercase fw-bold">{info.weekday}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="movie-schedule-vertical" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                        {Object.keys(groupedShowtimes).length === 0 ? (
                                            <div className="text-center py-4 text-muted"><i className="fas fa-film fa-2x mb-2 text-pink opacity-50"></i><p>Chưa có lịch chiếu.</p></div>
                                        ) : (
                                            Object.entries(groupedShowtimes).map(([format, times]) => (
                                                <div key={format} className="mb-3">
                                                    <span className="badge bg-dark text-white mb-2 px-3 py-1 rounded-pill shadow-sm">{format}</span>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {times.map((s) => (
                                                            <button key={s.id} className="btn btn-sm time-btn px-3 py-2" style={{ minWidth: "85px" }} onClick={() => navigate(`/booking?showtimeId=${s.id}&movieId=${movie.id}`)}>
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
                                    <i className="fas fa-store-alt fa-3x mb-3 text-pink opacity-50"></i><h5>Vui lòng chọn rạp</h5>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </div>

              {/* Sidebar Phim Đang Chiếu */}
              <div className="col-12 col-lg-4">
                <h5 className="mb-3 border-bottom border-pink pb-2 text-pink fw-bold">PHIM ĐANG CHIẾU</h5>
                <div className="d-flex flex-column gap-3" style={{ maxHeight: "700px", overflowY: "auto" }}>
                  {nowShowingMovies.map((m) => (
                    <div key={m.id} className="d-flex p-2 rounded bg-white shadow-sm border movie-side-card" style={{ cursor: "pointer", transition: "transform 0.2s" }} onClick={() => navigate(`/movie/${m.id}`)} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                      <img src={m.poster_url || "/poster_placeholder.png"} alt={m.title} className="rounded" style={{ width: "70px", height: "100px", objectFit: "cover", marginRight: "12px" }} />
                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-1 text-dark">{m.title}</h6>
                        <p className="small text-muted mb-1">{m.genre || "Hành động, Phiêu lưu"}</p>
                        <span className="badge bg-warning text-dark"><i className="fas fa-star me-1"></i>{m.rating || 8.5}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div ref={reviewRef}>
        <ReviewSection movieId={id} />
      </div>

      {/* Modal Trailer */}
      {playingTrailer && (
        <div className="modal-backdrop-custom" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleCloseTrailer}>
          <div className="modal-content-custom position-relative bg-black shadow-lg" style={{ width: '90%', maxWidth: '900px', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
           <button 
              className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
              style={{ zIndex: 1060 }}
              onClick={handleCloseTrailer}
            ></button>
            <iframe width="100%" height="100%" src={playingTrailer} title="Movie Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen>
            </iframe>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovieDetail;