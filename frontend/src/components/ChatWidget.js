import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../Context/AuthContext";
import io from "socket.io-client";
import { FaCommentDots, FaPaperPlane, FaTimes, FaHeadset } from "react-icons/fa";
import axios from "axios";
import "../css/ChatWidget.css";

const socket = io.connect("http://localhost:5000");

export default function ChatWidget() {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // --- THÊM STATE ĐẾM TIN NHẮN CHƯA ĐỌC ---
  const [unreadCount, setUnreadCount] = useState(0); 
  
  const messagesEndRef = useRef(null);
  
  // Dùng useRef để lưu trạng thái isOpen mới nhất bên trong socket callback
  const isOpenRef = useRef(isOpen); 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Cập nhật ref mỗi khi isOpen thay đổi
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      socket.emit("join_room", user.id);

      // 1. Lấy lịch sử chat và tính số tin chưa đọc ban đầu
      axios.get(`http://localhost:5000/api/chat/${user.id}`).then(res => {
          setMessages(res.data);
          
          // Đếm số tin nhắn từ Admin mà chưa đọc (is_read === 0)
          const unread = res.data.filter(msg => msg.sender !== 'user' && msg.is_read === 0).length;
          setUnreadCount(unread);
          
          scrollToBottom();
      });

      // 2. Lắng nghe tin nhắn mới
      socket.on("receive_message", (data) => {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();

        // LOGIC QUAN TRỌNG:
        // Nếu tin nhắn từ Admin VÀ Chat đang đóng -> Tăng biến đếm
        if (data.sender !== 'user' && !isOpenRef.current) {
            setUnreadCount(prev => prev + 1);
            // Có thể thêm âm thanh thông báo ở đây nếu thích: new Audio('/sound.mp3').play();
        }
      });
    }
    
    return () => {
        socket.off("receive_message");
    };
  }, [user]);

  // Scroll khi có tin nhắn mới hoặc mở chat
  useEffect(() => {
      if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // --- HÀM MỞ CHAT ---
  const handleOpenChat = async () => {
      setIsOpen(true);
      
      // Nếu có tin nhắn chưa đọc -> Reset về 0 và gọi API đánh dấu đã đọc
      if (unreadCount > 0) {
          setUnreadCount(0);
          try {
              await axios.put(`http://localhost:5000/api/chat/read/${user.id}`);
          } catch (error) {
              console.error("Lỗi đánh dấu đã đọc:", error);
          }
      }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const msgData = {
      userId: user.id,
      sender: "user",
      message: newMessage,
      created_at: new Date().toISOString()
    };

    // Optimistic UI: Hiển thị ngay lập tức để chat mượt hơn
    setMessages((prev) => [...prev, msgData]); 

    await socket.emit("send_message", msgData);
    setNewMessage("");
  };

  if (!user) return null; 

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button className="chat-btn" onClick={handleOpenChat}>
          <FaCommentDots size={28} />
          
          {/* --- HIỂN THỊ CHẤM ĐỎ NẾU CÓ TIN NHẮN MỚI --- */}
          {unreadCount > 0 && (
              <span className="unread-badge">
                  {unreadCount > 9 ? "9+" : unreadCount}
              </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="chat-box">
          <div className="chat-header">
            <div className="d-flex align-items-center">
                <FaHeadset className="me-2"/>
                <span>Hỗ trợ khách hàng</span>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}><FaTimes /></button>
          </div>

          <div className="chat-body">
            {messages.length === 0 && <p className="text-center text-muted small mt-3">Bạn cần hỗ trợ gì không? Hãy nhắn cho chúng tôi!</p>}
            
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.sender === "user" ? "message-right" : "message-left"}`}>
                  
                 {msg.sender !== 'user' && (
                     <div 
                        className="avatar-admin"
                        style={{
                            backgroundColor: msg.admin_role === 'admin' ? '#dc3545' : '#0d6efd'
                        }}
                        title={msg.admin_name || "Nhân viên hỗ trợ"}
                     >
                        {msg.admin_role === 'admin' ? 'AD' : 'NV'}
                     </div>
                 )}

                 <div className={`message-bubble ${msg.sender === "user" ? "bubble-user" : "bubble-admin"}`}>
                    {msg.sender !== 'user' && (
                        <div style={{fontSize: '10px', fontWeight: 'bold', color: '#666', marginBottom: '2px'}}>
                            {msg.admin_name || (msg.admin_role === 'admin' ? 'Quản trị viên' : 'Nhân viên')}
                        </div>
                    )}
                    {msg.message}
                 </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-footer">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}><FaPaperPlane /></button>
          </div>
        </div>
      )}
    </div>
  );
}