import React, { useState, useEffect } from "react";
import { FaTrash } from "react-icons/fa";

export default function PaymentsTab({ api }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // --- Fetch Data ---
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/payments");
      setPayments(res.data);
    } catch (err) {
      console.error("Lỗi tải giao dịch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // --- Delete Payment (Đã sửa logic ID) ---
  const handleDelete = async (bookingId) => { // Nhận bookingId
    if (!window.confirm(`Bạn chắc chắn muốn xóa đơn hàng #${bookingId}?`)) return;
    
    try {
      // Gọi API với ID chuẩn
      await api.delete(`/admin/payments/${bookingId}`);
      
      // Cập nhật State: Lọc bỏ item có booking_id trùng khớp
      setPayments((prev) => prev.filter((p) => p.booking_id !== bookingId));
      
      alert("Đã xóa đơn hàng thành công!");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi xóa đơn hàng");
    }
  };

  // --- Helpers ---
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateString) => 
    dateString ? new Date(dateString).toLocaleString('vi-VN') : "Vừa xong";

  const getStatusBadge = (status) => {
    const s = status ? status.toUpperCase() : '';
    if (s === 'PAID' || s === 'SUCCESS') return <span className="branch-badge" style={{backgroundColor: '#e8f5e9', color: '#2e7d32'}}>Thành công</span>;
    if (s === 'PENDING') return <span className="branch-badge" style={{backgroundColor: '#fff3e0', color: '#ef6c00'}}>Chờ thanh toán</span>;
    if (s === 'CANCELLED') return <span className="branch-badge" style={{backgroundColor: '#ffebee', color: '#c62828'}}>Đã hủy</span>;
    return <span className="branch-badge" style={{backgroundColor: '#f5f5f5', color: '#666'}}>Không rõ</span>;
  };

  // --- Pagination ---
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const paginated = payments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="tab-content">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title">Quản Lý Giao Dịch (Đơn Hàng)</h2>
      </div>

      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Khách hàng</th>
              <th>Thông tin phim</th>
              <th>Số tiền</th>
              <th>Thời gian tạo</th>
              <th>Trạng thái</th>
              <th style={{textAlign: 'center'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="7" className="text-center p-4">Đang tải dữ liệu...</td></tr>
            ) : paginated.length > 0 ? (
                paginated.map((p) => (
                <tr key={p.booking_id}> {/* Dùng booking_id làm key */}
                    <td style={{fontFamily: 'monospace', color: '#d63384', fontWeight: 'bold', fontSize: '1.1em'}}>
                        #{p.booking_id}
                    </td>
                    <td>
                        <div style={{fontWeight: '600', color: '#333'}}>{p.user_name || "Khách vãng lai"}</div>
                        <small className="text-muted" style={{fontSize: '0.8em'}}>{p.user_email}</small>
                    </td>
                    <td>
                        <div style={{maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={p.movie_title}>
                            {p.movie_title || "N/A"}
                        </div>
                        <small className="text-muted">{p.theater_name}</small>
                    </td>
                    <td className="price-tag">{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.created_at)}</td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td style={{textAlign: 'center'}}>
                    <button
                        className="btn-delete"
                        // Truyền booking_id vào hàm xóa
                        onClick={() => handleDelete(p.booking_id)} 
                        title="Xóa đơn hàng"
                    >
                        <FaTrash /> Xóa
                    </button>
                    </td>
                </tr>
                ))
            ) : (
                <tr><td colSpan="7" className="text-center p-4 text-muted">Chưa có đơn hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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