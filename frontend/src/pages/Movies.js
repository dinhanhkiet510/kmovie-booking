import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// Dùng bộ icon có sẵn của bạn
import { FaFilter, FaChevronLeft, FaChevronRight, FaStar, FaCalendarAlt, FaGlobe, FaFilm } from "react-icons/fa"; 
import "../css/Movies.css";
import Banner from "../components/Banner";
import NowShowingComponent from "../components/NowShowingComponent";
import UpcomingComponent from "../components/UpcomingComponent";

function Movies() {
  const [movies, setMovies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [genres, setGenres] = useState([]);
  
  // State bộ lọc
  const [filters, setFilters] = useState({
    country_id: "",
    genre_id: "",
    is_upcoming: "",
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const moviesPerPage = 12;

  const navigate = useNavigate();

  // Load danh mục (Quốc gia, Thể loại) 1 lần khi vào trang
  useEffect(() => {
    fetchCountries();
    fetchGenres();
  }, []);

  // Gọi lại API tìm kiếm MỖI KHI filters thay đổi
  useEffect(() => {
    fetchMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); 

  const fetchMovies = async () => {
    try {
      const query = new URLSearchParams();
      // Chỉ append khi giá trị khác rỗng
      if (filters.country_id) query.append("country_id", filters.country_id);
      if (filters.genre_id) query.append("genre_id", filters.genre_id);
      if (filters.is_upcoming !== "") query.append("is_upcoming", filters.is_upcoming);

      const queryString = query.toString();
      const url = queryString.length > 0
          ? `http://localhost:5000/api/movies/filter?${queryString}`
          : `http://localhost:5000/api/movies`;

      console.log("Fetching URL:", url); // Log để kiểm tra URL gọi đúng không

      const res = await fetch(url);
      const data = await res.json();
      setMovies(Array.isArray(data) ? data : []);
      setCurrentPage(1); // Reset về trang 1 khi lọc
    } catch (err) {
      console.error("Lỗi khi tải phim:", err);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/countries");
      const data = await res.json();
      setCountries(data);
    } catch (err) {
      console.error("Lỗi khi tải quốc gia:", err);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/genres");
      const data = await res.json();
      setGenres(data);
    } catch (err) {
      console.error("Lỗi khi tải thể loại:", err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // Cập nhật state, việc gọi API sẽ do useEffect lo
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // --- Phân trang (Frontend Pagination) ---
  const indexOfLastMovie = currentPage * moviesPerPage;
  const indexOfFirstMovie = indexOfLastMovie - moviesPerPage;
  const currentMovies = movies.slice(indexOfFirstMovie, indexOfLastMovie);
  const totalPages = Math.ceil(movies.length / moviesPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  console.log(movies)

  return (
    <div className="movies-page-wrapper">
      <Banner
        title="Thế Giới Điện Ảnh"
        description="Khám phá các bom tấn đang và sắp chiếu. Đặt vé ngay hôm nay!"
        listItems={[
          "Trải nghiệm điện ảnh đỉnh cao",
          "Đặt vé nhanh chóng, tiện lợi",
          "Ưu đãi hấp dẫn cho thành viên",
        ]}
        hideButton={true}
      />

      <div className="section-spacer">
         <NowShowingComponent />
      </div>
      <div className="section-spacer">
         <UpcomingComponent />
      </div>

      <section className="movies-main-section container" id="all-movies">
        {/* Header & Filter Bar */}
        <div className="movies-header">
          <div className="title-block">
            <h2 className="section-title">Kho Phim</h2>
            <p className="section-subtitle">Tìm kiếm bộ phim phù hợp với bạn</p>
          </div>

          <div className="filter-bar">
            <div className="filter-label">
                <FaFilter className="icon-pulse" />
                <span>Bộ lọc phim:</span>
            </div>
            
            <div className="select-group">
              <div className="custom-select-wrapper">
                <FaGlobe className="select-icon"/>
                <select
                  name="country_id"
                  className="custom-select"
                  value={filters.country_id}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả quốc gia</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="select-arrow"></span>
              </div>

              <div className="custom-select-wrapper">
                <FaFilm className="select-icon"/>
                <select
                  name="genre_id"
                  className="custom-select"
                  value={filters.genre_id}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả thể loại</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <span className="select-arrow"></span>
              </div>

              <div className="custom-select-wrapper">
                <FaCalendarAlt className="select-icon"/>
                <select
                  name="is_upcoming"
                  className="custom-select"
                  value={filters.is_upcoming}
                  onChange={handleFilterChange}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="0">Đang chiếu</option>
                  <option value="1">Sắp chiếu</option>
                </select>
                <span className="select-arrow"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="movies-grid-container">
          {currentMovies.length === 0 ? (
            <div className="empty-state">
              <FaFilm size={64} color="#ffb3c1" />
              <p>Không tìm thấy phim nào phù hợp.</p>
              <button 
                className="btn-reset" 
                onClick={() => setFilters({ country_id: "", genre_id: "", is_upcoming: "" })}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="movies-grid">
              {currentMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="movie-card"
                  onClick={() => navigate(`/movie/${movie.id}`)}
                >
                  <div className="poster-wrapper">
                    <img src={movie.poster_url} alt={movie.title} className="poster" loading="lazy" />
                    <div className="overlay">
                        <button className="btn-details">Đặt Vé Ngay</button>
                    </div>
                    {/* Rating Badge */}
                    <div className="rating-badge">
                        <FaStar size={12} color="#fff" />
                        <span>{movie.rating || 0}</span>
                    </div>
                  </div>
                  
                  <div className="movie-info">
                    <h5 className="movie-title" title={movie.title}>{movie.title}</h5>
                    <div className="movie-meta">
                        <span className="genre">{movie.genres}</span>
                        {/* <span className="duration">120p</span> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <button
              className="page-btn prev"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <FaChevronLeft size={14} />
            </button>
            
            <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                     <button 
                        key={page} 
                        className={`page-num ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                     >
                        {page}
                     </button>
                ))}
            </div>

            <button
              className="page-btn next"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
               <FaChevronRight size={14} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default Movies;