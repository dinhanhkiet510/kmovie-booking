import React, { useState, useEffect, useRef, useContext } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext"; // dùng context
import "../css/Header.css";

function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [movies, setMovies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Lấy user từ AuthContext
  const { user, logout } = useContext(AuthContext);

  // Lấy danh sách phim
  useEffect(() => {
    fetch("http://localhost:5000/api/movies")
      .then((res) => res.json())
      .then((data) => setMovies(data))
      .catch(console.error);
  }, []);

  // Lấy danh sách rạp
  useEffect(() => {
    fetch("http://localhost:5000/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data))
      .catch(console.error);
  }, []);

  // Filter search
  useEffect(() => {
    if (!searchValue) return setSearchResults([]);
    const filtered = movies.filter((m) =>
      m.title.toLowerCase().includes(searchValue.toLowerCase())
    );
    setSearchResults(filtered);
  }, [searchValue, movies]);

  // Click ngoài search box
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectMovie = (movieId) => {
    navigate(`/movie/${movieId}`);
    setShowSearch(false);
    setSearchValue("");
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo text-pink">MovieBooking</Link>

        <nav className={`nav-menu ${menuOpen ? "open" : ""}`}>
          <Link to="/">Trang chủ</Link>

          <div className="dropdown">
            <span className="dropbtn">Lịch chiếu</span>
            <div className="dropdown-content">
              <Link to="/nowshowing">Phim đang chiếu</Link>
              <Link to="/upcoming">Phim sắp chiếu</Link>
            </div>
          </div>

          <div className="dropdown">
            <span className="dropbtn">Rạp chiếu</span>
            <div className="dropdown-content">
              {brands.length > 0
                ? brands.map((b) => (
                    <Link key={b.id} to={`/theater/${b.id}`}>
                      {b.name}
                    </Link>
                  ))
                : "Đang tải..."}
            </div>
          </div>

          <Link to="/movies">Phim</Link>
          <Link to="/contact">Liên hệ</Link>

          {/* User / login */}
          {user ? (
            <div className="dropdown">
              <span className="dropbtn">{user.name}</span>
              <div className="dropdown-content">
                {user.type === "admin" ? (
                  <Link to="/admin/dashboard">Dashboard Admin</Link>
                ) : (
                  <Link to="/user/profile">Trang của tôi</Link>
                )}
                <Link to="/login" onClick={logout} style={{ cursor: "pointer" }}>
                  Đăng xuất
                </Link>
              </div>
            </div>
          ) : (
            <Link to="/login">Đăng nhập</Link>
          )}
        </nav>

        {/* Search + menu toggle */}
        <div className="right-controls">
          <div className="search-wrapper" ref={searchRef}>
            <button
              className="search-btn"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <FaTimes /> : <FaSearch />}
            </button>

            {showSearch && (
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.map((m) => (
                      <li
                        key={m.id}
                        className="search-item"
                        onClick={() => handleSelectMovie(m.id)}
                      >
                        <img src={m.poster_url} alt={m.title} />
                        <span>{m.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
