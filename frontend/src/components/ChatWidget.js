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
  const [unreadCount, setUnreadCount] = useState(0); 
  
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(isOpen); // Ref để theo dõi trạng thái mở/đóng trong socket

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Hàm gọi API đánh dấu đã đọc
  const markAsRead = async () => {
      try {
          await axios.put(`http://localhost:5000/api/chat/read/${user.id}`);
      } catch (error) {
          console.error("Lỗi đánh dấu đã đọc:", error);
      }
  };

  useEffect(() => {
    if (user) {
      socket.emit("join_room", user.id);

      // 1. Load tin nhắn cũ
      axios.get(`http://localhost:5000/api/chat/${user.id}`).then(res => {
          setMessages(res.data);
          // Đếm số tin chưa đọc từ Database
          const unread = res.data.filter(msg => msg.sender !== 'user' && msg.is_read === 0).length;
          setUnreadCount(unread);
          scrollToBottom();
      });

      // 2. Lắng nghe tin nhắn mới
      socket.on("receive_message", (data) => {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();

        // LOGIC QUAN TRỌNG:
        if (data.sender !== 'user') {
            if (isOpenRef.current) {
                // Nếu đang mở chat -> Gọi API đánh dấu đọc ngay lập tức
                markAsRead(); 
            } else {
                // Nếu đang đóng -> Tăng biến đếm thông báo
                setUnreadCount(prev => prev + 1);
            }
        }
      });
    }
    
    return () => {
        socket.off("receive_message");
    };
  }, [user]);

  useEffect(() => {
      if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Khi bấm mở chat
  const handleOpenChat = () => {
      setIsOpen(true);
      if (unreadCount > 0) {
          setUnreadCount(0); // Xóa số đỏ trên UI
          markAsRead(); // Gọi xuống DB update is_read = 1
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

    // --- FIX LỖI GỬI 2 LẦN: XÓA DÒNG setMessages Ở ĐÂY ---
    // setMessages((prev) => [...prev, msgData]); (Bỏ dòng này)
    // Lý do: Socket server sẽ gửi lại tin nhắn này về cho client, 
    // lúc đó socket.on("receive_message") sẽ tự thêm vào.

    await socket.emit("send_message", msgData);
    setNewMessage("");
  };

  if (!user) return null; 

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button className="chat-btn" onClick={handleOpenChat}>
          <FaCommentDots size={28} />
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
                     <div className="avatar-admin" style={{backgroundColor: msg.admin_role === 'admin' ? '#dc3545' : '#0d6efd'}} title={msg.admin_name}>
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