import React, { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import "../AdminCSS/AdminShared.css"; 
import { FaUserCircle, FaPaperPlane } from "react-icons/fa";

const socket = io.connect("http://localhost:5000");

export default function ChatTab({ api, user }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef(null);

  // Hàm load danh sách user
  const fetchUsers = async () => {
      try {
          const res = await api.get("/admin/chat/users");
          setUsers(res.data);
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchUsers();

    // Lắng nghe socket
    socket.on("admin_notification", (data) => {
        // Có tin mới -> Load lại list user để cập nhật thứ tự và số chưa đọc
        fetchUsers(); 
    });

    socket.on("receive_message", (data) => {
        // Nếu tin nhắn thuộc về user đang mở -> Hiện ra và đánh dấu đã đọc
        if (selectedUser && data.userId === selectedUser.id) {
            setMessages(prev => [...prev, data]);
            scrollToBottom();
            
            // Nếu admin đang nhìn thấy tin nhắn này -> Gọi API đánh dấu đọc ngay
            if(data.sender === 'user') {
                api.put(`/admin/chat/read/${data.userId}`);
            }
        } else {
            // Nếu tin nhắn của user KHÁC -> Cập nhật lại list user để hiện số đỏ
            fetchUsers();
        }
    });

    return () => {
        socket.off("admin_notification");
        socket.off("receive_message");
    };
  }, [api, selectedUser]); // Quan trọng: selectedUser thay đổi sẽ reset lại listener

  // Xử lý khi chọn user
  const handleSelectUser = async (u) => {
      setSelectedUser(u);
      socket.emit("admin_join_room", u.id);

      // Cập nhật UI ngay lập tức: User này đã đọc hết -> unread_count = 0
      setUsers(prev => prev.map(usr => usr.id === u.id ? {...usr, unread_count: 0} : usr));

      try {
          // Lấy tin nhắn
          const res = await api.get(`/chat/${u.id}`);
          setMessages(res.data);
          scrollToBottom();

          // QUAN TRỌNG: Gọi API xuống DB để sửa is_read = 1
          await api.put(`/admin/chat/read/${u.id}`);
          
          // Load lại list user lần nữa để đồng bộ chính xác với DB (đề phòng F5)
          fetchUsers();
      } catch (err) { console.error(err); }
  };

  const scrollToBottom = () => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSendReply = async () => {
      if (!reply.trim() || !selectedUser) return;

      const msgData = {
          userId: selectedUser.id,
          sender: "admin",
          adminId: user.id,
          message: reply,
          created_at: new Date().toISOString()
      };

      // --- FIX LỖI GỬI 2 LẦN ADMIN: XÓA DÒNG setMessages ---
      // setMessages(prev => [...prev, ...]); // Bỏ dòng này luôn
      
      await socket.emit("send_message", msgData);
      setReply("");
  };

  console.log("Selected User:", user);

  // ... (Phần return JSX giữ nguyên như cũ, chỉ cần thay logic JS ở trên là được) ...
  return (
    <div className="tab-content" style={{height: '85vh', display: 'flex', padding: 0, overflow: 'hidden'}}>
        {/* CỘT TRÁI: DANH SÁCH USER */}
        <div style={{width: '300px', borderRight: '1px solid #eee', overflowY: 'auto', backgroundColor: '#f8f9fa'}}>
            {users.map(u => (
                
                <div 
                    key={u.id} 
                    className={`p-3 cursor-pointer border-bottom ${selectedUser?.id === u.id ? 'bg-white border-start-pink' : ''}`}
                    onClick={() => handleSelectUser(u)}
                    style={{cursor: 'pointer', borderLeft: selectedUser?.id === u.id ? '4px solid #d63384' : '4px solid transparent'}}
                >
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center" style={{overflow: 'hidden'}}>
                            <div className="me-2 position-relative">
                                {u.avatar ? <img src={u.avatar} className="rounded-circle" style={{width: 40, height: 40}} alt=""/> : <FaUserCircle size={40} className="text-secondary"/>}
                            </div>
                            <div className="overflow-hidden">
                                <div className="fw-bold text-dark text-truncate">{u.name}</div>
                                <div className={`small text-truncate ${u.unread_count > 0 ? 'fw-bold text-dark' : 'text-muted'}`} style={{maxWidth: '150px'}}>
                                    {/* Nếu tin cuối là do admin gửi -> Hiện "Bạn: " */}
                                    {u.last_sender === 'admin' ? (
                                        <span>Bạn: {u.last_message}</span>
                                    ) : (
                                        /* Nếu do khách gửi -> Hiện luôn tin nhắn */
                                        <span>{u.last_message}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {u.unread_count > 0 && <span className="badge rounded-pill bg-danger ms-1">{u.unread_count}</span>}
                    </div>
                </div>
            ))}
        </div>

        {/* CỘT PHẢI: CHAT */}
        <div className="flex-grow-1 d-flex flex-column bg-white">
            {selectedUser ? (
                <>
                    <div className="p-3 border-bottom d-flex align-items-center shadow-sm" style={{height: '60px'}}>
                        <h5 className="m-0 fw-bold text-dark">{selectedUser.name}</h5>
                    </div>
                    <div className="flex-grow-1 p-3" style={{overflowY: 'auto', backgroundColor: '#f0f2f5'}}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`d-flex mb-3 ${msg.sender === 'admin' ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div className={`p-3 rounded-3 shadow-sm ${msg.sender === 'admin' ? 'bg-pink text-white' : 'bg-white text-dark'}`} 
                                     style={{maxWidth: '75%', borderBottomRightRadius: msg.sender==='admin'?0:15, borderBottomLeftRadius: msg.sender==='user'?0:15}}>
                                    {msg.message}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-top bg-white d-flex gap-2">
                        <input type="text" className="form-control rounded-pill" value={reply} onChange={(e) => setReply(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}/>
                        <button className="btn btn-add rounded-circle" style={{width: 45, height: 45}} onClick={handleSendReply}><FaPaperPlane /></button>
                    </div>
                </>
            ) : (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted"><h5>Chọn khách hàng để chat</h5></div>
            )}
        </div>
    </div>
  );
}