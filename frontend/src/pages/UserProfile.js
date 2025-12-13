import React, { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../Context/AuthContext";
import { createApi } from "../utils/api"; 
import { useNavigate } from "react-router-dom";
import { 
  FaUserCircle, FaSave, FaTimes, FaEdit, FaKey, FaInfoCircle, 
  FaPhone, FaBirthdayCake, FaTransgender, FaGem, FaTicketAlt, FaEye, FaHistory, FaCrown 
} from 'react-icons/fa'; 
import MovieTicket from "../components/MovieTicket"; 
import "../css/UserProfile.css";

export default function UserProfile() {
  const { user, logout } = useContext(AuthContext); 
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [bookings, setBookings] = useState([]); 
  const [allCombos, setAllCombos] = useState([]); 
  const [activeTab, setActiveTab] = useState("info"); 
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", birth_date: "", gender: "Nam", avatar: "" });
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); 
  const [filterDate, setFilterDate] = useState(""); 
  const [selectedTicket, setSelectedTicket] = useState(null); 

  const api = useMemo(() => {
    return createApi(() => {
      logout();
      navigate("/login");
    });
  }, [logout, navigate]);

  const formatDateLocal = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  // --- 1. LOGIC XẾP HẠNG THÀNH VIÊN ---
  const getMembershipLevel = (points) => {
      // Logic: 1 điểm = 10.000đ.
      // Bạc: 200 điểm (2tr), Vàng: 500 điểm (5tr), Kim Cương: 1000 điểm (10tr)
      if (!points) return { name: "Thành Viên Mới", color: "#f0f0f0", textColor: "#666", icon: "🌱" };
      if (points >= 1000) return { name: "Kim Cương", color: "#b9f2ff", textColor: "#007bff", icon: "💎" }; 
      if (points >= 500) return { name: "Vàng", color: "#fff3cd", textColor: "#856404", icon: "👑" }; 
      if (points >= 200) return { name: "Bạc", color: "#e2e3e5", textColor: "#383d41", icon: "🥈" }; 
      return { name: "Đồng", color: "#f8d7da", textColor: "#721c24", icon: "🥉" };
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resProfile, resBookings, resCombos] = await Promise.all([
            api.get("/user/profile"),
            api.get("/user/bookings"),
            api.get("/combos") 
        ]);

        setProfileData(resProfile.data);
        setBookings(resBookings.data);
        setAllCombos(resCombos.data); 
        
        const userProfile = resProfile.data?.user;
        setEditData({ 
          name: userProfile?.name || "", 
          email: userProfile?.email || "",
          phone: userProfile?.phone || "",
          birth_date: userProfile?.birth_date ? formatDateLocal(userProfile.birth_date) : "",
          gender: userProfile?.gender || "Nam",
          avatar: userProfile?.avatar || ""
        });
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
        if (err.response?.status === 401) {
            logout();
            navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, logout, navigate]); 

  const handleChange = (e) => { const { name, value } = e.target; setEditData(prev => ({ ...prev, [name]: value })); };
  const handlePwChange = (e) => { const { name, value } = e.target; setPasswords(prev => ({ ...prev, [name]: value })); };

  const handleSaveInfo = async () => {
    setLoading(true); setMessage("");
    try {
      await api.put("/user/profile", editData); 
      setProfileData(prev => ({ ...prev, user: { ...prev.user, ...editData } }));
      setEditing(false); setMessage("Cập nhật thành công!");
    } catch (err) { setMessage(err.response?.data?.message || "Thất bại!"); } 
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    setMessage("");
    const { oldPassword, newPassword, confirmPassword } = passwords;
    if (!newPassword) return setMessage("Nhập mật khẩu mới");
    if (newPassword !== confirmPassword) return setMessage("Mật khẩu không khớp");
    
    setLoading(true);
    try {
      await api.put("/user/change-password", { oldPassword, newPassword });
      setMessage("Đổi mật khẩu thành công!");
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { setMessage(err.response?.data?.message || "Lỗi đổi mật khẩu"); }
    finally { setLoading(false); }
  };

  const getFilteredTickets = () => {
    if (!profileData?.tickets) return [];
    if (!filterDate) return profileData.tickets;
    return profileData.tickets.filter(t => formatDateLocal(t.show_date) === filterDate);
  };
  const filteredTickets = getFilteredTickets();

  const renderStatus = (status) => {
      const s = status ? status.toUpperCase() : "";
      if (s === "PAID" || s === "SUCCESS") return <span className="badge bg-success">Thành công</span>;
      if (s === "PENDING") return <span className="badge bg-warning text-dark">Chờ thanh toán</span>;
      if (s === "CHECKED_IN") return <span className="badge bg-primary">Đã sử dụng</span>;
      return <span className="badge bg-secondary">Đã hủy</span>;
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const parseCombos = (combosJson) => {
      if (!combosJson) return "Không có";
      try {
          const list = JSON.parse(combosJson);
          return list.map(c => {
              const name = c.name || (allCombos.find(item => item.id === c.id)?.name) || "Combo";
              return `${name} x${c.quantity}`;
          }).join(", ");
      } catch (e) { return "Lỗi dữ liệu"; }
  };

  if (loading && !profileData) return <div className="p-5 text-center">Đang tải thông tin...</div>;
  if (!profileData) return <div className="p-5 text-center">Vui lòng đăng nhập lại.</div>;

  const currentUserInfo = profileData.user;
  const userAvatar = currentUserInfo.avatar || `https://ui-avatars.com/api/?name=${currentUserInfo.name}&background=d63384&color=fff`;
  const defaultPoster = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=100&q=60";

  // --- Tính hạng thành viên ---
  const level = getMembershipLevel(currentUserInfo.points || 0);

  return (
    <div className="profile-container">
       {/* --- 2. GIAO DIỆN HEADER MỚI --- */}
       <div className="profile-header">
          <div className="avatar-display">
            <img src={userAvatar} alt="Avatar" onError={(e) => {e.target.src=`https://ui-avatars.com/api/?name=${currentUserInfo.name}`}} />
          </div>
          <div className="user-details-summary">
             <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px'}}>
                 <h3 style={{margin: 0}}>{currentUserInfo.name}</h3>
                 
                 {/* Badge Hạng Thành Viên */}
                 <span className="badge rounded-pill shadow-sm" 
                       style={{
                           backgroundColor: level.color, 
                           color: level.textColor, 
                           fontSize: '0.85rem', 
                           display: 'flex', 
                           alignItems: 'center', 
                           gap: '5px',
                           padding: '5px 10px'
                       }}>
                     {level.icon} {level.name}
                 </span>
             </div>

             <p style={{margin: '0 0 10px 0', opacity: 0.8}}>{currentUserInfo.email}</p>
             
             {/* Hiển thị điểm nổi bật */}
             <div className="points-display p-2 rounded d-inline-flex align-items-center" 
                  style={{backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)'}}>
                <FaGem className="text-warning me-2" />
                <span style={{marginRight: '5px'}}>Điểm tích lũy:</span>
                <span className="fw-bold text-warning fs-5">
                    {currentUserInfo.points ? currentUserInfo.points.toLocaleString() : 0}
                </span>
             </div>
          </div>
       </div>
       {/* ----------------------------- */}
       
       <div className="tabs-profile">
        <button className={activeTab === "info" ? "active" : ""} onClick={() => setActiveTab("info")}>
          <FaInfoCircle /> Thông tin cá nhân
        </button>
        <button className={activeTab === "transactions" ? "active" : ""} onClick={() => setActiveTab("transactions")}>
          <FaHistory /> Lịch sử giao dịch
        </button>
        <button className={activeTab === "tickets" ? "active" : ""} onClick={() => setActiveTab("tickets")}>
          <FaTicketAlt /> Vé của tôi
        </button>
        <button className={activeTab === "password" ? "active" : ""} onClick={() => setActiveTab("password")}>
          <FaKey /> Đổi mật khẩu
        </button>
      </div>

      <div className="ticket-section mt-0">
        {/* --- TAB 1: THÔNG TIN --- */}
        {activeTab === "info" && (
            <div className="tab-content">
            <h4>Chỉnh sửa thông tin</h4>
            <div className="form-group">
                <label>Ảnh đại diện (URL)</label>
                <input type="text" name="avatar" value={editData.avatar} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
                <label>Họ và tên</label>
                <input type="text" name="name" value={editData.name} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={editData.email} onChange={handleChange} disabled={true} />
            </div>
            <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" name="phone" value={editData.phone} onChange={handleChange} disabled={!editing} />
            </div>
            
            <div className="form-row">
                <div className="form-group">
                <label>Ngày sinh <FaBirthdayCake /></label>
                <input type="date" name="birth_date" value={editData.birth_date} onChange={handleChange} disabled={!editing} />
                </div>
                <div className="form-group">
                <label>Giới tính <FaTransgender /></label>
                <select name="gender" value={editData.gender} onChange={handleChange} disabled={!editing}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                </select>
                </div>
            </div>

            {!editing ? (
                <button className="edit-btn" onClick={() => setEditing(true)}>
                <FaEdit /> Chỉnh sửa thông tin
                </button>
            ) : (
                <div className="edit-actions">
                <button className="cancel-btn" onClick={() => setEditing(false)} disabled={loading}>
                    <FaTimes /> Hủy bỏ
                </button>
                <button className="save-btn" onClick={handleSaveInfo} disabled={loading}>
                    {loading ? "Đang lưu..." : <><FaSave /> Lưu thay đổi</>}
                </button>
                </div>
            )}
            </div>
        )}

        {/* --- TAB 2: LỊCH SỬ GIAO DỊCH --- */}
        {activeTab === "transactions" && (
            <div className="tab-content">
                <h4><FaHistory className="me-2"/> Lịch sử giao dịch</h4>
                <div className="table-container">
                    <table className="ticket-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Phim</th>
                                <th>Tổng tiền (Vé + Combo)</th>
                                <th>Chi tiết Combo</th>
                                <th>Ngày đặt</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.length > 0 ? bookings.map(b => (
                                <tr key={b.id}>
                                    <td className="fw-bold text-pink">#{b.id}</td>
                                    <td>
                                        <div className="fw-bold">{b.movie_title}</div>
                                        <small className="text-muted">{b.theater_name}</small>
                                    </td>
                                    <td className="fw-bold text-success fs-6">
                                        {formatCurrency(b.total_price)}
                                    </td>
                                    <td>
                                        <small className="text-muted">{parseCombos(b.combos_data)}</small>
                                    </td>
                                    <td>
                                        {new Date(b.created_at || Date.now()).toLocaleString('vi-VN')}
                                    </td>
                                    <td>{renderStatus(b.status)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center p-4">Chưa có giao dịch nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- TAB 3: VÉ CỦA TÔI --- */}
        {activeTab === "tickets" && (
            <div className="ticket-section mt-0">
                <div className="ticket-header-control mb-3" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h4><FaTicketAlt className="me-2"/> Vé xem phim</h4>
                    <div className="date-filter">
                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{padding: '5px 10px', borderRadius: '5px', border: '1px solid #ccc'}} />
                        {filterDate && <button onClick={() => setFilterDate("")} style={{marginLeft: '10px', border: 'none', background: 'transparent', color: 'red', textDecoration: 'underline'}}>Xóa</button>}
                    </div>
                </div>

                {selectedTicket && <MovieTicket ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}

                <div className="table-container">
                    <table className="ticket-table">
                        <thead>
                            <tr>
                                <th>Mã Vé</th>
                                <th>Poster</th>
                                <th>Phim</th>
                                <th>Rạp & Ghế</th>
                                <th>Suất chiếu</th>
                                <th>Giá ghế</th> 
                                <th>Trạng thái</th>
                                <th style={{textAlign: 'center'}}>Xem QR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.length > 0 ? filteredTickets.map(t => (
                                <tr key={t.id} onClick={() => setSelectedTicket(t)} className="clickable-row" style={{cursor: 'pointer'}}>
                                    <td><strong>{t.id}</strong></td>
                                    <td className="poster-cell">
                                        <img 
                                            src={t.poster_url || defaultPoster} 
                                            alt="poster" 
                                            style={{ width: '45px', height: '65px', objectFit: 'cover', borderRadius: '4px' }}
                                            onError={(e) => {e.target.onerror = null; e.target.src = defaultPoster}}
                                        />
                                    </td>
                                    <td style={{fontWeight: 'bold', color: '#333'}}>{t.movie_title}</td>
                                    <td>
                                        <div>{t.theater_name}</div>
                                        <span className="badge bg-info text-dark mt-1">{t.seat_number}</span>
                                    </td>
                                    <td>
                                        {t.show_time.slice(0,5)}<br/>
                                        <small>{new Date(t.show_date).toLocaleDateString('vi-VN')}</small>
                                    </td>
                                    <td className="fw-bold text-secondary">
                                        {Number(t.ticket_price).toLocaleString('vi-VN')}₫
                                    </td>
                                    <td>{renderStatus(t.status)}</td>
                                    <td style={{textAlign: 'center'}}><FaEye style={{color: '#007bff'}} /></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8" className="text-center p-4">Không tìm thấy vé.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- TAB 4: ĐỔI MẬT KHẨU --- */}
        {activeTab === "password" && (
            <div className="tab-content">
            <h4>Đổi mật khẩu</h4>
            <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input type="password" name="oldPassword" value={passwords.oldPassword} onChange={handlePwChange} />
            </div>
            <div className="form-group">
                <label>Mật khẩu mới</label>
                <input type="password" name="newPassword" value={passwords.newPassword} onChange={handlePwChange} />
            </div>
            <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handlePwChange} />
            </div>
            <button className="change-password-btn" onClick={handleChangePassword} disabled={loading}>
                {loading ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
            </div>
        )}
      </div>
    </div>
  );
}