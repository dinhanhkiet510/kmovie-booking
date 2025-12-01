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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (user) {
      socket.emit("join_room", user.id);

      axios.get(`http://localhost:5000/api/chat/${user.id}`).then(res => {
          setMessages(res.data);
          scrollToBottom();
      });

      socket.on("receive_message", (data) => {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      });
    }
    
    return () => {
        socket.off("receive_message");
    };
  }, [user]);

  useEffect(() => {
      scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const msgData = {
      userId: user.id,
      sender: "user",
      message: newMessage,
      created_at: new Date().toISOString()
    };

    await socket.emit("send_message", msgData);
    setNewMessage("");
  };

  if (!user) return null; 

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button className="chat-btn" onClick={() => setIsOpen(true)}>
          <FaCommentDots size={28} />
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
                            // Admin màu đỏ, Staff màu xanh dương
                            backgroundColor: msg.admin_role === 'admin' ? '#dc3545' : '#0d6efd'
                        }}
                        title={msg.admin_name || "Nhân viên hỗ trợ"}
                     >
                        {/* Nếu là Admin hiện "AD", Staff hiện "NV" */}
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