import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../css/TheaterDetail.css";

function TheaterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [brand, setBrand] = useState(null);
  const [branches, setBranches] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedCity, setSelectedCity] = useState("HCM");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Lấy 7 ngày tới
  useEffect(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d.toISOString().split("T")[0];
    });
    setAvailableDates(days);
    setSelectedDate(days[0]);
  }, []);

  // Fetch brand + branches
  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const [brandRes, branchRes] = await Promise.all([
          fetch(`http://localhost:5000/api/brands/${id}`),
          fetch(`http://localhost:5000/api/brands/${id}/branches`),
        ]);
        const brandData = await brandRes.json();
        const branchData = await branchRes.json();
        setBrand(brandData);
        setBranches(branchData);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu rạp:", err);
      }
    };
    fetchBrandData();
  }, [id]);

  // Normalize helper
  const normalize = (str) =>
    str
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,]/g, "")
      .toLowerCase()
      .trim() || "";

  // Lọc chi nhánh theo thành phố
  const filteredBranches = useMemo(() => {
    const keywordMap = {
      HCM: ["hcm", "ho chi minh"],
      HN: ["ha noi"],
      DN: ["da nang"],
      CT: ["can tho"],
      KH: ["khanh hoa", "nha trang"],
      HUE: ["hue", "thua thien hue"],
    };

    const keywords = keywordMap[selectedCity] || [];
    return branches.filter((b) => {
      const normalized = normalize(b.location);
      return keywords.some((kw) => normalized.includes(kw));
    });
  }, [branches, selectedCity]);

  // Thành phố có chi nhánh thật
  const availableCities = useMemo(() => {
    const cityChecks = [
      { code: "HCM", name: "Hồ Chí Minh", keywords: ["TP.HCM", "Hồ Chí Minh"] },
      { code: "HN", name: "Hà Nội", keywords: ["Hà Nội"] },
      { code: "DN", name: "Đà Nẵng", keywords: ["Đà Nẵng"] },
      { code: "CT", name: "Cần Thơ", keywords: ["Cần Thơ"] },
      { code: "KH", name: "Khánh Hòa", keywords: ["Khánh Hòa", "Nha Trang"] },
      { code: "HUE", name: "Huế", keywords: ["Huế", "Thừa Thiên Huế"] },
    ];
    return cityChecks.filter((c) =>
      branches.some((b) =>
        c.keywords.some((kw) => normalize(b.location).includes(normalize(kw)))
      )
    );
  }, [branches]);

  // Tự động chọn thành phố đầu tiên có chi nhánh nếu HCM không tồn tại
  useEffect(() => {
    if (availableCities.length > 0 && !availableCities.some((c) => c.code === selectedCity)) {
      setSelectedCity(availableCities[0].code);
    }
  }, [availableCities, selectedCity]);

  // Khi chọn chi nhánh => lấy lịch chiếu
  useEffect(() => {
    if (!selectedBranch) return;
    const fetchShowtimes = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/showtimes`);
        const data = await res.json();
        // Lọc theo branch
        const branchShowtimes = data.filter(s => s.theater === selectedBranch.name);
        setShowtimes(branchShowtimes);
      } catch (err) {
        console.error("Lỗi khi tải lịch chiếu:", err);
      }
    };
    fetchShowtimes();
  }, [selectedBranch]);

  // Gom nhóm phim + format giờ
  const groupedMovies = useMemo(() => {
    if (!showtimes.length || !selectedDate) return [];

    const filtered = showtimes.filter((s) => {
      const localDate = new Date(s.show_date);
      const localDateString = localDate.toLocaleDateString("en-CA");
      return localDateString === selectedDate;
    });

    const map = {};
    for (const s of filtered) {
      const key = s.movie;
      if (!map[key]) {
        map[key] = {
          id: s.movie_id || null,
          title: s.movie,
          poster_url: s.poster_url || "https://via.placeholder.com/120x160?text=No+Image",
          description: s.description || "Không có mô tả.",
          formats: {},
        };
      }
      const format = s.format || "2D";
      map[key].formats[format] = map[key].formats[format] || [];
      map[key].formats[format].push({ time: s.show_time, showtimeId: s.id });
    }

    return Object.values(map);
  }, [showtimes, selectedDate]);


  const goToBookingPage = (showtimeId, movieId) => {
    navigate(`/booking?showtimeId=${showtimeId}&movieId=${movieId}`);
  };

  if (!brand)
    return <div className="loading text-center py-5">Đang tải thông tin rạp...</div>;

  return (
    <section className="container my-5 p-4 rounded shadow bg-white theater-detail-container">
      {/* Header brand */}
      <div className="d-flex flex-column flex-md-row align-items-center mb-4 border-bottom pb-3">
        {brand.logo && (
          <img
            src={brand.logo}
            alt={brand.name}
            style={{ width: 120, height: 120, objectFit: "contain" }}
          />
        )}
        <div className="ms-md-3">
          <h2 className="fw-bold text-pink">{brand.name}</h2>
          <p className="text-muted">
            Hệ thống rạp chiếu hiện đại – trải nghiệm điện ảnh đỉnh cao.
          </p>
        </div>
      </div>

      <div className="row g-0">
        {/* Cột chọn chi nhánh */}
        <div className="col-12 col-md-3 border-end pe-3">
          <select
            className="form-select form-select-sm mb-3"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            {availableCities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>

          <div style={{ maxHeight: 450, overflowY: "auto" }}>
            {filteredBranches.map((b) => (
              <div
                key={b.id}
                className={`branch-item p-2 mb-2 rounded text-black ${
                  selectedBranch?.id === b.id ? "bg-light border border-pink" : ""
                }`}
                onClick={() => setSelectedBranch(b)}
                style={{ cursor: "pointer" }}
              >
                <strong className={selectedBranch?.id === b.id ? "text-pink" : ""}>
                  {b.name}
                </strong>
                <p className="text-muted small mb-0">{b.location}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cột lịch chiếu */}
        <div className="col-12 col-md-9 ps-md-4">
          {selectedBranch ? (
            <>
              <div className="p-3 bg-light border rounded mb-4">
                <h4 className="fw-bold text-pink mb-2">{selectedBranch.name}</h4>
                <p className="text-black">
                  <strong>Địa chỉ:</strong> {selectedBranch.location}
                </p>
              </div>

              {/* Thanh chọn ngày */}
              <div className="d-flex flex-nowrap overflow-auto mb-3 text-black">
                {availableDates.map((d) => {
                  const dateObj = new Date(d);
                  return (
                    <div
                      key={d}
                      className={`p-2 me-2 rounded text-center ${
                        selectedDate === d ? "bg-pink text-white" : "bg-light"
                      }`}
                      onClick={() => setSelectedDate(d)}
                      style={{ minWidth: 70, cursor: "pointer" }}
                    >
                      <div className="fw-bold">
                        {dateObj.getDate()}/{dateObj.getMonth() + 1}
                      </div>
                      <div className="small">
                        {dateObj.toLocaleDateString("vi-VN", { weekday: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Danh sách phim */}
              <div className="showtimes-scroll">
                {groupedMovies.length === 0 ? (
                  <p className="text-muted">Không có lịch chiếu.</p>
                ) : (
                  groupedMovies.map((movie) => (
                    <div
                      key={movie.title}
                      className="movie-card p-3 border rounded mb-3 d-flex bg-light"
                    >
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="movie-poster"
                        style={{
                          width: 120,
                          height: 160,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginRight: 12,
                        }}
                      />
                      <div>
                        <h5 className="fw-bold text-pink">{movie.title}</h5>
                        <p className="small text-muted">{movie.description}</p>

                        {Object.entries(movie.formats).map(([format, times]) => (
                          <div key={format}>
                            <span className="badge bg-secondary mb-2">{format}</span>
                            <div className="d-flex flex-wrap gap-2">
                              {times.map((showtimeObj, idx) => (
                                <button
                                  key={idx}
                                  className="btn btn-outline-primary btn-sm"
                                  style={{ transition: "0.2s" }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.transform = "scale(1.1)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.transform = "scale(1)")
                                  }
                                  onClick={() =>
                                    goToBookingPage(showtimeObj.showtimeId, movie.id)
                                  }
                                >
                                  {showtimeObj.time}
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
            <p className="text-muted">Chọn chi nhánh để xem lịch chiếu.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default TheaterDetail;
