import React, { useState, useEffect, useRef } from 'react';
import io from "socket.io-client";
import "../AdminCSS/AdminShared.css"; 
import { FaUserCircle, FaPaperPlane } from "react-icons/fa";

const socket = io.connect("http://localhost:5000");

export default function ChatTab({ api, user }) { // user ở đây là Admin đang đăng nhập
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const messagesEndRef = useRef(null);

  // 1. Lấy danh sách user
  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await api.get("/admin/chat/users");
            setUsers(res.data);
        } catch (err) { console.error(err); }
    };
    fetchUsers();

    socket.on("admin_notification", (data) => {
        fetchUsers();
    });

    return () => socket.off("admin_notification");
  }, [api]);

  // 2. Chọn user
  const handleSelectUser = async (u) => {
      setSelectedUser(u);
      socket.emit("admin_join_room", u.id);

      try {
          const res = await api.get(`/chat/${u.id}`);
          setMessages(res.data);
          scrollToBottom();
      } catch (err) { console.error(err); }
  };

  // 3. Nhận tin nhắn realtime
  useEffect(() => {
      socket.on("receive_message", (data) => {
          if (selectedUser && data.userId === selectedUser.id) {
              setMessages(prev => [...prev, data]);
              scrollToBottom();
          }
      });
      return () => socket.off("receive_message");
  }, [selectedUser]);

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

      await socket.emit("send_message", msgData);
      setReply("");
  };

  return (
    <div className="tab-content" style={{height: '85vh', display: 'flex', padding: 0, overflow: 'hidden'}}>
        {/* CỘT TRÁI: DANH SÁCH USER */}
        <div style={{width: '300px', borderRight: '1px solid #eee', overflowY: 'auto', backgroundColor: '#f8f9fa'}}>
            <div className="p-3 border-bottom bg-white">
                <h5 className="m-0 text-pink fw-bold">Tin nhắn</h5>
            </div>
            {users.map(u => (
                <div 
                    key={u.id} 
                    className={`p-3 cursor-pointer border-bottom ${selectedUser?.id === u.id ? 'bg-white border-start-pink' : ''}`}
                    onClick={() => handleSelectUser(u)}
                    style={{cursor: 'pointer', borderLeft: selectedUser?.id === u.id ? '4px solid #d63384' : '4px solid transparent'}}
                >
                    <div className="d-flex align-items-center">
                        <div className="me-2">
                            {u.avatar ? <img src={u.avatar} className="rounded-circle" style={{width: 40, height: 40}} alt=""/> : <FaUserCircle size={40} className="text-secondary"/>}
                        </div>
                        <div className="overflow-hidden">
                            <div className="fw-bold text-dark">{u.name}</div>
                            <div className="small text-muted text-truncate" style={{maxWidth: '180px'}}>{u.last_message}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* CỘT PHẢI: KHUNG CHAT */}
        <div className="flex-grow-1 d-flex flex-column bg-white">
            {selectedUser ? (
                <>
                    {/* Header */}
                    <div className="p-3 border-bottom d-flex align-items-center shadow-sm" style={{height: '60px'}}>
                        <h5 className="m-0 fw-bold text-dark">{selectedUser.name}</h5>
                        <span className="ms-2 badge bg-success">Online</span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-grow-1 p-3" style={{overflowY: 'auto', backgroundColor: '#f0f2f5'}}>
                        {messages.map((msg, index) => (
                            <div key={index} className={`d-flex mb-3 ${msg.sender === 'admin' ? 'justify-content-end' : 'justify-content-start'}`}>
                                
                                {/* Avatar Khách (Hiện bên trái) */}
                                {msg.sender !== 'admin' && (
                                    <div className="me-2 mt-1">
                                        <FaUserCircle className="text-secondary" size={28}/>
                                    </div>
                                )}

                                <div className="d-flex flex-column" style={{alignItems: msg.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '75%'}}>
                                    
                                    {/* --- HIỂN THỊ TÊN & ROLE ADMIN/STAFF --- */}
                                    {msg.sender === 'admin' && (
                                        <div className="d-flex align-items-center mb-1">
                                            <span 
                                                className="badge rounded-pill"
                                                style={{
                                                    fontSize: '0.65rem', 
                                                    // Admin màu Đỏ, Staff màu Xanh
                                                    backgroundColor: msg.admin_role === 'admin' ? '#dc3545' : '#0d6efd'
                                                }}
                                            >
                                                {msg.admin_role === 'admin' ? 'Admin' : 'Staff'}
                                            </span>
                                        </div>
                                    )}
                                    {/* --------------------------------------- */}

                                    <div 
                                        className={`p-3 rounded-3 shadow-sm ${msg.sender === 'admin' ? 'bg-pink text-white' : 'bg-white text-dark'}`}
                                        style={{
                                            borderBottomRightRadius: msg.sender === 'admin' ? 0 : 15, 
                                            borderBottomLeftRadius: msg.sender === 'user' ? 0 : 15
                                        }}
                                    >
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-top bg-white d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control rounded-pill"
                            placeholder="Nhập tin nhắn trả lời..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                        />
                        <button className="btn btn-add rounded-circle p-0" style={{width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={handleSendReply}>
                            <FaPaperPlane style={{marginLeft: '-2px'}} />
                        </button>
                    </div>
                </>
            ) : (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                    <FaUserCircle size={60} className="mb-3 opacity-25"/>
                    <h5>Chọn một khách hàng để bắt đầu chat</h5>
                </div>
            )}
        </div>
    </div>
  );
}