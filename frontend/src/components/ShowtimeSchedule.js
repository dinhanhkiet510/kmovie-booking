import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt } from "react-icons/fa";

const ShowtimeSchedule = ({ theaters, showtimes, movies }) => {
  const navigate = useNavigate();

  // --- State nội bộ ---
  const [selectedCity, setSelectedCity] = useState("HCM");
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [brandOpen, setBrandOpen] = useState({});
  const [availableDates] = useState(getNextSevenDays());
  const [selectedDateRaw, setSelectedDateRaw] = useState(availableDates[0]);

  // --- Helpers ---
  function getNextSevenDays() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date.toISOString().split("T")[0];
    });
  }

  const getDayInfo = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const weekday = date.toLocaleDateString("vi-VN", { weekday: "short" });
    return { day, weekday };
  };

  const toggleBrand = (brand) => {
    setBrandOpen((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const cityMap = {
    HCM: "TP.HCM", HN: "Hà Nội", DN: "Đà Nẵng", CT: "Cần Thơ", KH: "Khánh Hòa", Hue: "Huế",
  };

  // --- Logic lọc rạp ---
  const filteredTheaters = useMemo(() => {
    return theaters.filter((t) =>
      selectedCity in cityMap 
        ? (t.location && t.location.includes(cityMap[selectedCity])) 
        : true
    );
  }, [theaters, selectedCity]);

  // Nhóm rạp theo thương hiệu
  const theaterGroups = useMemo(() => {
    return filteredTheaters.reduce((acc, theater) => {
      const brand = theater.name.split(" ")[0];
      if (!acc[brand]) acc[brand] = [];
      acc[brand].push(theater);
      return acc;
    }, {});
  }, [filteredTheaters]);

  // Chọn rạp đầu tiên khi đổi thành phố
  useEffect(() => {
    setSelectedTheater(filteredTheaters[0] || null);
  }, [filteredTheaters]);

  // --- Logic Gom nhóm suất chiếu ---
  const groupedMovies = useMemo(() => {
    if (!selectedTheater || !selectedDateRaw) return [];
    
    // 1. Lọc suất chiếu theo rạp và ngày
    const filtered = showtimes.filter((s) => {
      const localDate = new Date(s.show_date);
      const localDateString = localDate.toLocaleDateString("en-CA");
      return s.theater === selectedTheater.name && localDateString === selectedDateRaw;
    });

    // 2. Gom nhóm theo phim -> định dạng
    const grouped = filtered.reduce((acc, s) => {
      const movie = movies.find((m) => m.title === s.movie); // Tìm thông tin phim từ props movies
      if (!movie) return acc;

      if (!acc[movie.id]) acc[movie.id] = { ...movie, formats: {} };
      const formatKey = s.format || "2D Phụ đề";
      if (!acc[movie.id].formats[formatKey]) acc[movie.id].formats[formatKey] = [];
      
      acc[movie.id].formats[formatKey].push({ time: s.show_time, id: s.id });
      return acc;
    }, {});

    return Object.values(grouped);
  }, [selectedTheater, selectedDateRaw, showtimes, movies]);

  return (
    <section className="container my-5 p-4" id="showtimes">
      <h2 className="mb-4 text-center text-pink fw-bold section-title">
           Lịch Chiếu Phim
      </h2>
      
      <div className="row g-0 bg-white rounded overflow-hidden shadow-sm">
        {/* Cột chọn rạp */}
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
                      />
                      <strong>{brand}</strong>
                  </div>
                  <span>{brandOpen[brand] ? "▲" : "▼"}</span>
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
              <div className="date d-flex flex-nowrap overflow-x-auto mb-4 pb-2" style={{gap: '12px'}}>
                {availableDates.map((d) => {
                  const info = getDayInfo(d);
                  const isActive = selectedDateRaw === d;
                  return (
                    <div
                      key={d}
                      className={`date-item p-2 text-center cursor-pointer ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedDateRaw(d)}
                      style={{ minWidth: 75 }}
                    >
                      <div className="fw-bold fs-5">{info.day}</div>
                      <div className="small fw-bold text-uppercase">{info.weekday}</div>
                    </div>
                  );
                })}
              </div>

              <div className="movie-schedule-vertical pe-2 custom-scrollbar" style={{ maxHeight: 600, overflowY: "auto" }}>
                {groupedMovies.length === 0 ? (
                  <div className="text-center text-muted py-5">
                      <FaCalendarAlt size={50} className="mb-3 text-pink opacity-50" />
                      <h5>Không có suất chiếu nào cho ngày này.</h5>
                  </div>
                ) : (
                  groupedMovies.map((movie) => (
                    <div key={movie.id} className="movie-row mb-4 p-3 d-flex flex-column flex-md-row align-items-start">
                      <div 
                          className="me-0 me-md-4 mb-3 mb-md-0 flex-shrink-0"
                          onClick={() => navigate(`/movie/${movie.id}`)}
                          style={{cursor: 'pointer'}}
                      >
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="rounded movie-thumb"
                          style={{ width: 130, height: 185, objectFit: "cover" }}
                        />
                      </div>

                      <div className="flex-grow-1 pt-1">
                        <h4 
                          className="fw-bold mb-2 text-pink cursor-pointer"
                          onClick={() => navigate(`/movie/${movie.id}`)}
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
                                      navigate(`/booking?showtimeId=${item.id}&movieId=${movie.id}`); 
                                  }}
                                >
                                  {item.time.toString().slice(0,5)}
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
                <h4>Vui lòng chọn một rạp để xem lịch chiếu</h4>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ShowtimeSchedule;