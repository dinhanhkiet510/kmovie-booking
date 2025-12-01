
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import TheaterDetail from "./pages/TheaterDetail";
import Movies from "./pages/Movies";
import NowShowing from "./pages/NowShowing";
import Upcoming from "./pages/UpcomingMovie";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./Admin/AdminDashboard";
import UserProfile from "./pages/UserProfile";
import BookingPage from "./pages/BookingPage";
import BlogDetail from "./pages/BlogDetail";
import PromotionDetail from "./pages/PromotionDetail";
import ChatWidget from "./components/ChatWidget";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "bootstrap/dist/css/bootstrap.min.css";

import { AuthProvider } from "./Context/AuthContext";

function AppContent() {
  const location = useLocation();

  // Danh sách route không cần Header & Footer
  const noLayoutRoutes = ["/admin/dashboard"];

  // Kiểm tra xem có nằm trong danh sách không
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  return (
    <div className="d-flex flex-column min-vh-100">
      {!hideLayout && <Header />}
      <main className="flex-fill">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nowshowing" element={<NowShowing />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/theater/:id" element={<TheaterDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/user/profile" element={<UserProfile /> } />
          <Route path="/booking" element={<BookingPage /> } />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/promotion/:id" element={<PromotionDetail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
      {!hideLayout && <Footer />}

      {/* nếu đang ở trang admin sẽ ẩn bong bóng chat đi */}
      {!hideLayout && <ChatWidget />} 
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
