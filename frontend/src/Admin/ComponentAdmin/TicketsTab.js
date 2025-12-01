import React, { useState, useEffect } from "react";
import { FaTrash, FaSearch, FaCalendarAlt, FaFilter, FaTicketAlt } from "react-icons/fa";
import "../AdminCSS/AdminShared.css"; 

export default function TicketsTab({ api }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- State cho bộ lọc ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // --- Fetch Tickets ---
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/tickets");
      setTickets(res.data);
    } catch (err) {
      console.error("Lỗi tải vé:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // --- Xử lý Xóa Vé ---
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa vé này? Hành động này không thể hoàn tác.")) return;
    try {
      await api.delete(`/admin/tickets/${id}`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      alert("Đã xóa vé thành công!");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi xóa vé");
    }
  };

  // --- Helpers Format ---
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateString) => 
    dateString ? new Date(dateString).toLocaleString('vi-VN') : "N/A";

  const getStatusBadge = (status) => {
    const s = status ? status.toUpperCase() : '';
    if (s === 'PAID' || s === 'BOOKED') return <span className="branch-badge" style={{backgroundColor: '#e8f5e9', color: '#2e7d32'}}>Đã thanh toán</span>;
    if (s === 'CHECKED_IN') return <span className="branch-badge" style={{backgroundColor: '#e3f2fd', color: '#1565c0'}}>Đã soát vé</span>;
    if (s === 'PENDING') return <span className="branch-badge" style={{backgroundColor: '#fff3e0', color: '#ef6c00'}}>Chờ thanh toán</span>;
    return <span className="branch-badge" style={{backgroundColor: '#ffebee', color: '#c62828'}}>Đã hủy</span>;
  };

  // --- LOGIC BỘ LỌC (ĐÃ FIX) ---
  const filteredTickets = tickets.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    
    // 1. Lọc theo từ khóa (Thêm check null an toàn)
    const matchesSearch = (
      (t.user_name && t.user_name.toLowerCase().includes(searchLower)) || 
      (t.user_email && t.user_email.toLowerCase().includes(searchLower)) || 
      (t.movie_title && t.movie_title.toLowerCase().includes(searchLower)) || 
      (t.theater_name && t.theater_name.toLowerCase().includes(searchLower)) || 
      (t.id && t.id.toString().includes(searchLower)) 
    );

    // 2. Lọc theo ngày đặt vé (FIX LỆCH MÚI GIỜ)
    let matchesDate = true;
    if (filterDate) {
        // Sử dụng en-CA để lấy YYYY-MM-DD theo giờ địa phương của máy tính
        const ticketDate = new Date(t.booking_date).toLocaleDateString('en-CA');
        matchesDate = ticketDate === filterDate;
    }

    return matchesSearch && matchesDate;
  });

  // --- Phân trang ---
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginated = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title">Quản Lý Vé Đặt</h2>
      </div>

      {/* Thanh công cụ (Tìm kiếm + Lọc ngày) */}
      <div className="controls mb-4 d-flex flex-wrap gap-3" style={{maxWidth: '900px'}}>
         
         {/* Ô Tìm kiếm */}
         <div className="input-group" style={{position: 'relative', flex: 2, minWidth: '250px'}}>
             {/* Icon Search: Thêm zIndex và pointerEvents để không chặn click */}
             <FaSearch style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', zIndex: 10, pointerEvents: 'none'}} />
             <input 
                type="text" 
                className="form-control rounded w-100"
                style={{paddingLeft: '35px', paddingRight: '10px', height: '40px', border: '1px solid #ddd'}}
                placeholder="Tìm ID, Khách, Phim hoặc Rạp..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
             />
         </div>

         {/* Ô Lọc Ngày */}
         <div className="input-group" style={{position: 'relative', flex: 1, minWidth: '200px'}}>
             <FaCalendarAlt style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', zIndex: 10, pointerEvents: 'none'}} />
             <input 
                type="date" 
                className="form-control rounded w-100"
                style={{paddingLeft: '35px', height: '40px', border: '1px solid #ddd', color: filterDate ? '#333' : '#888'}}
                value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                title="Lọc theo ngày đặt vé"
             />
             {/* Nút xóa lọc ngày */}
             {filterDate && (
                 <button 
                    onClick={() => setFilterDate("")}
                    style={{position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#dc3545', zIndex: 20, cursor: 'pointer', padding: '0 5px'}}
                    title="Xóa lọc ngày"
                 >
                     ✕
                 </button>
             )}
         </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>#ID</th>
              <th style={{width: '80px'}}>Poster</th>
              <th>Thông tin Phim</th>
              <th>Rạp & Ghế</th>
              <th>Khách hàng</th>
              <th>Giá Vé</th>
              <th>Trạng thái</th>
              <th style={{textAlign: 'center'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="8" className="text-center p-4">Đang tải dữ liệu...</td></tr>
            ) : paginated.length > 0 ? (
                paginated.map((t) => (
                <tr key={t.id}>
                    <td><strong>{t.id}</strong></td>
                    
                    <td className="poster-cell">
                        <img 
                            src={t.poster_url} 
                            alt="poster" 
                            onError={(e) => {e.target.onerror = null; e.target.src="https://via.placeholder.com/60x90?text=No+Img"}}
                        />
                    </td>

                    <td style={{maxWidth: '200px'}}>
                        <div style={{fontWeight: '600', color: '#d63384'}}>{t.movie_title}</div>
                        <small className="text-muted">
                            {t.show_time ? t.show_time.toString().slice(0,5) : '--:--'} 
                            <span className="mx-1">|</span> 
                            {t.show_date ? new Date(t.show_date).toLocaleDateString('vi-VN') : ''}
                        </small>
                    </td>

                    <td>
                        <div style={{fontWeight: '500'}}>{t.theater_name}</div>
                        <span className="seat-badge mt-1 d-inline-block">
                            Ghế {t.seat_number || "N/A"}
                        </span>
                    </td>

                    <td>
                        <div style={{fontWeight: '600'}}>{t.user_name || "Khách vãng lai"}</div>
                        <small className="text-muted">{t.user_email}</small>
                    </td>

                    <td>
                        <div className="price-tag">{formatCurrency(t.price)}</div>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                            {formatDate(t.booking_date)}
                        </small>
                    </td>

                    <td>{getStatusBadge(t.status)}</td>

                    <td style={{textAlign: 'center'}}>
                        <button 
                            className="btn-delete" 
                            onClick={() => handleDelete(t.id)}
                            title="Hủy vé này"
                        >
                            <FaTrash /> Hủy
                        </button>
                    </td>
                </tr>
                ))
            ) : (
                <tr><td colSpan="8" className="text-center p-4 text-muted">
                    Không tìm thấy vé nào phù hợp.
                </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button 
                key={p} 
                onClick={() => setCurrentPage(p)} 
                className={p === currentPage ? "active" : ""}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}