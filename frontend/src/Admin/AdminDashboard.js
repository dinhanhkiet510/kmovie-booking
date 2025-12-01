import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { createApi } from "../utils/api.js";

// Import Icons
import { 
  FaFilm, FaCalendarAlt, FaStore, FaTags, FaHamburger, 
  FaTicketAlt, FaStar, FaCreditCard, FaDoorOpen, 
  FaSignOutAlt, FaUserShield, FaUserTie, FaDesktop,
  FaNewspaper, FaGift, FaQrcode, FaComments, FaChartLine
} from "react-icons/fa";

// Import Components
import MoviesTab from "./ComponentAdmin/MoviesTab";
import ShowtimesTab from "./ComponentAdmin/ShowtimesTab";
import TheatersTab from "./ComponentAdmin/TheatersTab";
import BrandsTab from "./ComponentAdmin/BrandsTab";
import CombosTab from "./ComponentAdmin/CombosTab";
import ReviewsTab from "./ComponentAdmin/ReviewsTab";
import TicketsTab from "./ComponentAdmin/TicketsTab";
import PaymentsTab from "./ComponentAdmin/PaymentsTab";
import BlogsTab from "./ComponentAdmin/BlogsTab"; 
import PromotionsTab from "./ComponentAdmin/PromotionsTab";
import ScannerTab from "./ComponentAdmin/ScannerTab";
import ChatTab from "./ComponentAdmin/ChatTab.js";
import RevenueTab from "./ComponentAdmin/RevenueTab"; 
import "./AdminCSS/Dashboard.css";
import "./AdminCSS/Roomstab.css"

// Cấu hình Menu (Tabs)
const TABS_CONFIG = {
  // Nhóm Thống Kê
  stats:     { label: "Doanh thu", icon: <FaChartLine /> }, // <--- TAB MỚI

  // Nhóm Vận Hành
  scanner:   { label: "Soát Vé", icon: <FaQrcode /> },
  tickets:   { label: "Quản lý Vé", icon: <FaTicketAlt /> },
  chat:      { label: "CSKH / Chat", icon: <FaComments /> },
  
  // Nhóm Nội Dung & Dịch Vụ
  movies:    { label: "Phim", icon: <FaFilm /> },
  showtimes: { label: "Lịch chiếu", icon: <FaCalendarAlt /> },
  combos:    { label: "Bắp & Nước", icon: <FaHamburger /> },
  reviews:   { label: "Đánh giá", icon: <FaStar /> },

  // Nhóm Quản Trị & Cấu Hình
  payments:  { label: "Thanh toán", icon: <FaCreditCard /> },
  promotions:{ label: "Khuyến mãi", icon: <FaGift /> },
  blogs:     { label: "Tin tức", icon: <FaNewspaper /> },
  theaters:  { label: "Rạp chiếu", icon: <FaStore /> },
  brands:    { label: "Thương hiệu", icon: <FaTags /> },
};

// --- PHÂN QUYỀN CHUẨN ---
const ROLE_PERMISSIONS = {
  admin: [
    "stats", "scanner", "tickets", "chat", "payments",
    "movies", "showtimes", "combos", "promotions", "blogs",
    "theaters", "brands", "reviews"
  ],
  
  staff: [
    "scanner", "tickets", "chat", 
    "showtimes", "movies", "combos", 
  ]
};

export default function Dashboard() {
  const { user, accessToken, refreshToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const api = useMemo(() => {
    return createApi(
      () => accessToken,
      () => refreshToken,
      () => {
        logout();
        navigate("/login");
      }
    );
  }, [accessToken, refreshToken, logout, navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (!activeTab) {
      const allowedTabs = user.roles?.includes("admin") ? ROLE_PERMISSIONS.admin : ROLE_PERMISSIONS.staff;
      setActiveTab(allowedTabs[0] || "");
    }
  }, [user, activeTab, navigate]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      logout();
      navigate("/login");
    }
  };

  if (!user) return <div className="p-5 text-center">Đang tải thông tin...</div>;
  
  if (!isDesktop) return (
    <div className="desktop-warning">
      <FaDesktop />
      <h2>Giao diện Admin</h2>
      <p>Vui lòng sử dụng Laptop hoặc PC để có trải nghiệm quản lý tốt nhất.</p>
    </div>
  );

  const availableTabs = user.roles?.includes("admin") ? ROLE_PERMISSIONS.admin : ROLE_PERMISSIONS.staff;

  const renderTabContent = () => {
    const props = { api, user };
    switch(activeTab){
      case "stats": return <RevenueTab {...props} />;
      case "scanner": return <ScannerTab {...props} />;
      case "movies": return <MoviesTab {...props} />;
      case "showtimes": return <ShowtimesTab {...props} />;
      case "theaters": return <TheatersTab {...props} />;
      case "brands": return <BrandsTab {...props} />;
      case "combos": return <CombosTab {...props} />;
      case "tickets": return <TicketsTab {...props} />;
      case "reviews": return <ReviewsTab {...props} />;
      case "payments": return <PaymentsTab {...props} />;
      case "blogs": return <BlogsTab {...props} />;
      case "promotions": return <PromotionsTab {...props} />;
      case "chat": return <ChatTab {...props} />;
      default: return <div className="p-4">Chức năng đang phát triển hoặc bạn không có quyền truy cập.</div>;
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>
             {user.roles?.includes("admin") ? <FaUserShield /> : <FaUserTie />} 
             <span>{user.roles?.includes("admin") ? "Quản Trị" : "Nhân Viên"}</span>
          </h2>
        </div>

        <div className="tabs custom-scrollbar">
          {availableTabs.map(key => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`nav-item ${activeTab === key ? "active" : ""}`}
            >
              {TABS_CONFIG[key].icon}
              <span>{TABS_CONFIG[key].label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar-circle" style={{backgroundColor: user.roles?.includes("admin") ? '#d63384' : '#0d6efd'}}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-details">
              <h4 className="text-truncate" style={{maxWidth: '150px'}}>{user.name}</h4>
              <span className="badge bg-light text-dark border">
                  {user.roles?.includes("admin") ? "Administrator" : "Staff Member"}
              </span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="content admin-portal">
        {renderTabContent()}
      </main>
    </div>
  );
}