import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler // Import thêm Filler để tô màu nền biểu đồ
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "../AdminCSS/AdminShared.css"; 
import { FaCoins, FaTicketAlt, FaUsers } from "react-icons/fa";

// Đăng ký component
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function RevenueTab({ api }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/stats?year=${year}`);
        setStats(res.data);
      } catch (err) {
        console.error("Lỗi tải thống kê:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api, year]);

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  if (loading) return <div className="d-flex justify-content-center align-items-center h-100"><div className="spinner-border text-secondary" role="status"></div></div>;
  if (!stats) return <div className="text-center p-5 text-muted">Chưa có dữ liệu thống kê.</div>;

  // --- CẤU HÌNH BIỂU ĐỒ (CHÍNH XÁC & TỐI GIẢN) ---
  
  // 1. Biểu đồ Đường (Doanh thu) - Phong cách Line sạch sẽ
  const revenueData = {
    labels: stats.monthlyRevenue.map((item) => `T${item.month}`),
    datasets: [
      {
        label: "Doanh thu thực tế",
        data: stats.monthlyRevenue.map((item) => item.total),
        borderColor: "#d81b60", // Màu hồng đậm chủ đạo
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(216, 27, 96, 0.2)");
          gradient.addColorStop(1, "rgba(216, 27, 96, 0)");
          return gradient;
        },
        borderWidth: 2,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#d81b60",
        pointHoverBackgroundColor: "#d81b60",
        pointHoverBorderColor: "#fff",
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3, // Đường cong nhẹ
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Ẩn chú thích thừa
      tooltip: {
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: (context) => `Doanh thu: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f0f0f0', borderDash: [5, 5] }, // Lưới mờ nét đứt
        ticks: { 
            color: '#888', 
            font: { size: 11 },
            callback: (value) => value >= 1000000 ? `${value/1000000}tr` : value // Rút gọn số
        }
      },
      x: {
        grid: { display: false }, // Ẩn lưới dọc
        ticks: { color: '#888', font: { size: 11 } }
      }
    }
  };

  // 2. Biểu đồ Cột (Top Phim) - Đơn sắc chuyên nghiệp
  const movieData = {
    labels: stats.topMovies.map((m) => m.title.length > 20 ? m.title.substring(0, 20) + "..." : m.title),
    datasets: [
      {
        label: "Số vé bán ra",
        data: stats.topMovies.map((m) => m.ticket_count),
        backgroundColor: "#34495e", // Màu xám xanh chuyên nghiệp
        borderRadius: 4,
        barThickness: 25,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#333',
            callbacks: {
                label: (context) => `${context.raw} vé`
            }
        }
    },
    scales: {
        y: { grid: { display: false }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#555', font: {weight: '500'} } }
    }
  };

  // 3. Biểu đồ Tròn (Rạp) - Tông màu nhẹ nhàng
  const theaterData = {
    labels: stats.revenueByTheater.map((t) => t.name),
    datasets: [
      {
        data: stats.revenueByTheater.map((t) => t.total),
        backgroundColor: ["#d81b60", "#ad1457", "#880e4f", "#ec407a", "#f48fb1"], // Các sắc độ hồng
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="tab-content bg-white p-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
        <div>
            <h2 className="m-0 fw-bold text-dark" style={{fontSize: '1.5rem', border: 'none', padding: 0}}>
                Báo Cáo Hoạt Động
            </h2>
            <p className="text-muted small m-0">Tổng quan tình hình kinh doanh hệ thống rạp</p>
        </div>
        
        <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-secondary small">Năm tài chính:</span>
            <select 
                className="form-select form-select-sm fw-bold border-secondary text-dark" 
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                style={{width: '100px', boxShadow: 'none'}}
            >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
            </select>
        </div>
      </div>

      {/* --- KPI CARDS (Tone trắng - Icon màu) --- */}
      <div className="row mb-5 g-4">
        <div className="col-md-4">
          <div className="h-100 p-4 rounded-3 border d-flex align-items-center justify-content-between bg-white card-hover">
            <div>
                <p className="text-muted text-uppercase fw-bold small mb-1">Doanh thu năm</p>
                <h3 className="fw-bold text-dark m-0">{formatCurrency(stats.summary.totalRevenue)}</h3>
            </div>
            <div className="icon-circle bg-pink-light text-pink">
                <FaCoins size={24} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="h-100 p-4 rounded-3 border d-flex align-items-center justify-content-between bg-white card-hover">
            <div>
                <p className="text-muted text-uppercase fw-bold small mb-1">Tổng vé bán</p>
                <h3 className="fw-bold text-dark m-0">{stats.summary.totalTickets.toLocaleString()}</h3>
            </div>
            <div className="icon-circle bg-blue-light text-blue">
                <FaTicketAlt size={24} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="h-100 p-4 rounded-3 border d-flex align-items-center justify-content-between bg-white card-hover">
            <div>
                <p className="text-muted text-uppercase fw-bold small mb-1">Khách hàng</p>
                <h3 className="fw-bold text-dark m-0">{stats.summary.totalUsers}</h3>
            </div>
            <div className="icon-circle bg-green-light text-green">
                <FaUsers size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* --- CHARTS SECTION --- */}
      <div className="row g-4">
        {/* Biểu đồ Doanh thu (Chiếm 8 phần) */}
        <div className="col-lg-8">
          <div className="p-4 border rounded-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark m-0">Biểu đồ doanh thu</h5>
                <span className="badge bg-light text-dark border">Đơn vị: VNĐ</span>
            </div>
            <div style={{ height: "300px" }}>
                <Line data={revenueData} options={lineOptions} />
            </div>
          </div>
        </div>

        {/* Biểu đồ Rạp (Chiếm 4 phần) */}
        <div className="col-lg-4">
          <div className="p-4 border rounded-3 h-100 d-flex flex-column">
            <h5 className="fw-bold text-dark mb-4">Tỷ trọng nguồn thu</h5>
            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                 <div style={{width: '85%'}}>
                    <Doughnut data={theaterData} options={{plugins: {legend: {position: 'bottom', labels: {usePointStyle: true, padding: 20}}}}} />
                 </div>
            </div>
          </div>
        </div>

        {/* Biểu đồ Phim (Full width) */}
        <div className="col-12">
          <div className="p-4 border rounded-3 mt-2">
             <h5 className="fw-bold text-dark mb-4">Top 5 Phim Có Doanh Số Cao Nhất</h5>
             <div style={{ height: "250px" }}>
                 <Bar data={movieData} options={barOptions} />
             </div>
          </div>
        </div>
      </div>
      
      {/* CSS Inline để đảm bảo style hoạt động ngay */}
      <style>{`
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); border-color: transparent !important; }
        
        .icon-circle { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        
        .bg-pink-light { background-color: #fce4ec; }
        .text-pink { color: #d81b60; }
        
        .bg-blue-light { background-color: #e3f2fd; }
        .text-blue { color: #1976d2; }

        .bg-green-light { background-color: #e8f5e9; }
        .text-green { color: #2e7d32; }
      `}</style>
    </div>
  );
}