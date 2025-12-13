import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenerativeAI } from "@google/generative-ai";

// IMPORT WEBSOCKET
import { createServer } from "http"; 
import { Server } from "socket.io";  

dotenv.config();

// --- CẤU HÌNH CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tạo thư mục tạm nếu chưa có
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}
const upload = multer({ dest: 'uploads/' });


// --- CẤU HÌNH GỬI MAIL (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendTicketEmail = async (userEmail, ticketData) => {
  try {
    // 2. Nội dung Email (HTML)
    const mailOptions = {
      from: '"MovieBooking Cinema" <no-reply@moviebooking.com>',
      to: userEmail,
      subject: `[MovieBooking] Vé điện tử: ${ticketData.movieName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #d63384; padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">VÉ ĐIỆN TỬ</h2>
          </div>
          
          <div style="padding: 20px;">
            <p>Xin chào <strong>${ticketData.userName}</strong>,</p>
            <p>Thanh toán thành công! Dưới đây là thông tin vé của bạn:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="color: #d63384; margin-top: 0;">${ticketData.movieName}</h3>
              <img src="${ticketData.movieImage}" alt="${ticketData.movieName}" style="width: 100%; max-width: 300px; border-radius: 5px; margin-bottom: 10px;" />
              <p><strong>Rạp:</strong> ${ticketData.theaterName}</p>
              <p><strong>Suất chiếu:</strong> ${ticketData.showTime} - ${ticketData.showDate}</p>
              <p><strong>Ghế:</strong> <span style="font-size: 18px; font-weight: bold;">${ticketData.seats}</span></p>
              <p><strong>Combo:</strong> ${ticketData.combos || "Không có"}</p>
              <p><strong>Tổng tiền:</strong> ${parseInt(ticketData.totalPrice).toLocaleString()}đ</p>
            </div>
            <div style="text-align: center; margin: 20px 0;">
                <p><strong>Vui lòng xem vé điện tử của bạn trên website của chúng tôi:</strong></p>
            </div>
          </div>
          <div style="background-color: #eee; padding: 10px; text-align: center; font-size: 12px; color: #666;">
            Cảm ơn bạn đã sử dụng dịch vụ của MovieBooking!
          </div>
        </div>
      `,
    };
    // 3. Gửi
    await transporter.sendMail(mailOptions);
    console.log(`Email vé đã gửi tới: ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    return false;
  }
};


// --- CẤU HÌNH GOOGLE CLIENT ---
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// --- CẤU HÌNH GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
    }
});

const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());


// ============================================================
// 1. KẾT NỐI DATABASE
// ============================================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kmovie",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// ============================================================
// WEBSOCKET
const httpServer = createServer(app);
const io = new Server(httpServer, {   // Khởi tạo io
  cors: {
    origin: "http://localhost:3000", // Cho phép frontend truy cập
    methods: ["GET", "POST"]
  }
});

// ============================================================
// 2. MIDDLEWARE XÁC THỰC (AUTH)
// ============================================================

// Middleware cho Admin & Staff
const authenticateJWT = (type) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token không tồn tại" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Kiểm tra type token có khớp với yêu cầu không (admin/staff)
    if (!["admin", "staff"].includes(payload.type)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};

// Middleware phân quyền chi tiết (Role)
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.roles) return res.status(403).json({ message: "Không có quyền" });
  const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
  if (!hasRole) return res.status(403).json({ message: "Quyền hạn không đủ" });
  next();
};

// Middleware cho User thường
const authenticateUserJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Vui lòng đăng nhập" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "user") return res.status(403).json({ message: "Token không hợp lệ" });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Phiên đăng nhập hết hạn" });
  }
};

// ============================================================
// 3. HELPER FUNCTIONS (HÀM HỖ TRỢ CRUD CHUNG)
// ============================================================
const handleGetAll = (tableName) => async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Lỗi khi lấy dữ liệu ${tableName}` });
  }
};

const handleCreate = (tableName, extraInsert = null) => async (req, res) => {
  try {
    let data = { ...req.body };

    
    delete data.created_at;

    const keys = Object.keys(data).filter(k => !(extraInsert && extraInsert.excludeKeys?.includes(k)));
    
    if (keys.length === 0) return res.status(400).json({ message: "Dữ liệu rỗng" });

    const values = keys.map(k => {
        let val = data[k];
        // Kiểm tra nếu là chuỗi và có dạng "2025-12-06T..."
        if (typeof val === 'string' && val.includes('T') && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
            // Cắt bỏ phần mili giây và thay T bằng khoảng trắng
            return val.slice(0, 19).replace('T', ' ');
        }
        return val;
    });

    const placeholders = keys.map(() => "?").join(", ");

    const [result] = await pool.query(
      `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`,
      values
    );

    if (extraInsert?.callback) await extraInsert.callback(result.insertId, data);

    res.status(201).json({ message: "Tạo mới thành công", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Lỗi khi tạo dữ liệu bảng ${tableName}` });
  }
};

const handleUpdate = (tableName, extraUpdate = null) => async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Lọc các key hợp lệ
    const keys = Object.keys(data).filter(
      k => !(extraUpdate && extraUpdate.excludeKeys?.includes(k)) && data[k] !== undefined
    );

    if (keys.length === 0) return res.status(400).json({ message: "Không có dữ liệu cập nhật" });

    const values = keys.map(k => {
        let val = data[k];
        // Kiểm tra nếu là chuỗi ngày tháng dạng ISO (có chữ T)
        if (typeof val === 'string' && val.includes('T') && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
            // Cắt lấy YYYY-MM-DD HH:mm:ss
            return val.slice(0, 19).replace('T', ' '); 
        }
        return val;
    });

    const setString = keys.map(k => `${k}=?`).join(", ");

    await pool.query(`UPDATE ${tableName} SET ${setString} WHERE id=?`, [...values, id]);

    if (extraUpdate?.callback) await extraUpdate.callback(id, data);

    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: `Lỗi khi cập nhật ${tableName}` });
  }
};

// Hàm xóa chung
const handleDelete = (tableName) => async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM ${tableName} WHERE id=?`, [id]);
        res.json({ message: "Xóa thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: `Lỗi khi xóa ${tableName}` });
    }
};

// ============================================================
// 4. AUTHENTICATION ROUTES (LOGIN/REGISTER/REFRESH)
// ============================================================
// Đăng nhập (Gộp Admin/User)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Thiếu email hoặc password" });

    // 1. Check Admin Table
    const [admins] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
    if (admins.length) {
      const admin = admins[0];
      if (!(await bcrypt.compare(password, admin.password))) return res.status(401).json({ message: "Sai mật khẩu" });

      const [roles] = await pool.query(`SELECT r.name FROM roles r JOIN admin_roles ar ON ar.role_id=r.id WHERE ar.admin_id=?`, [admin.id]);
      const roleNames = roles.map(r => r.name);
      const type = roleNames.includes("admin") ? "admin" : "staff";

      const accessToken = jwt.sign({ id: admin.id, roles: roleNames, type }, process.env.JWT_SECRET, { expiresIn: "1h" });
      const refreshToken = jwt.sign({ id: admin.id, roles: roleNames, type }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

      await pool.query("UPDATE admins SET refresh_token=? WHERE id=?", [refreshToken, admin.id]);
      return res.json({ accessToken, refreshToken, user: { id: admin.id, name: admin.name, email: admin.email, roles: roleNames, type } });
    }

    // 2. Check User Table
    const [users] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (!users.length) return res.status(401).json({ message: "Tài khoản không tồn tại" });

    const user = users[0];
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Sai mật khẩu" });

    const [roles] = await pool.query(`SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?`, [user.id]);
    const roleNames = roles.map(r => r.name);

    const accessToken = jwt.sign({ id: user.id, roles: roleNames, type: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user.id, type: "user" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await pool.query("UPDATE users SET refresh_token=? WHERE id=?", [refreshToken, user.id]);
    res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, roles: roleNames } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi đăng nhập" });
  }
});

// Đăng ký User
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone, birth_date, gender } = req.body;

    // 1. Validate cơ bản
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: "Vui lòng nhập đủ tên, email, mật khẩu và số điện thoại" });
    }

    // 2. KIỂM TRA TRÙNG EMAIL (Ở CẢ 2 BẢNG)
    // Check bảng users
    const [userExist] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    // Check bảng admins
    const [adminExist] = await pool.query("SELECT id FROM admins WHERE email = ?", [email]);

    // Nếu tồn tại ở bất kỳ bảng nào -> Báo lỗi
    if (userExist.length > 0 || adminExist.length > 0) {
        return res.status(400).json({ message: "Email này đã được sử dụng trong hệ thống." });
    }

    // 3. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Tạo User mới
    const sql = `
        INSERT INTO users (name, email, password, phone, birth_date, gender) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(sql, [
        name, 
        email, 
        hashedPassword, 
        phone, 
        birth_date || null, 
        gender || 'Khác'
    ]);

    // 5. Gán quyền Customer
    await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [result.insertId, 3]);

    res.status(201).json({ message: "Đăng ký thành công" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
});

// Đăng nhập Google
app.post("/api/auth/google-login", async (req, res) => {
    const { token } = req.body;
    
    try {
        // A. Xác minh token với Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload; 

        let user = null;
        let table = 'users';  
        let tokenType = 'user'; 
        let role = 'customer';

        // B. Tìm user trong DB
        // 1. Check bảng users
        const [usersList] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (usersList.length > 0) {
            user = usersList[0];
            if (!user.avatar) {
                await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [picture, user.id]);
                user.avatar = picture;
            }
            // Mặc định user tìm thấy ở đây là khách hàng -> tokenType = 'user'
        } else {
            // 2. Check bảng admins
            const [adminsList] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
            if (adminsList.length > 0) {
                user = adminsList[0];
                table = 'admins';
                tokenType = 'admin'; // Nếu là admin thì type là 'admin'
                
                
                const [roleRows] = await pool.query(`SELECT r.name FROM roles r JOIN admin_roles ar ON ar.role_id=r.id WHERE ar.admin_id=?`, [user.id]);
                if (roleRows.length > 0) {
                     role = roleRows.map(r => r.name).includes('admin') ? 'admin' : 'staff';
                } else {
                     role = 'admin';
                }
            }
        }

        // C. Đăng ký mới nếu chưa có (Chỉ tạo User)
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const sqlInsert = `INSERT INTO users (name, email, password, avatar, phone, gender) VALUES (?, ?, ?, ?, '', 'Khác')`;
            const [result] = await pool.query(sqlInsert, [name, email, hashedPassword, picture]);
            
            const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
            user = newUser[0];
            
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, 3)", [user.id]);
            // Mặc định là user mới -> tokenType = 'user'
        }

        // D. Tạo Token JWT
        const accessToken = jwt.sign(
            { id: user.id, type: tokenType, role: role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        const refreshToken = jwt.sign(
            { id: user.id, type: tokenType }, 
            process.env.JWT_REFRESH_SECRET, 
            { expiresIn: '7d' }
        );

        // E. Lưu Refresh Token vào DB
        await pool.query(`UPDATE ${table} SET refresh_token = ? WHERE id = ?`, [refreshToken, user.id]);

        // F. Trả về kết quả
        res.json({
            message: "Đăng nhập Google thành công",
            user: { 
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                type: tokenType // Trả về type đúng để frontend điều hướng
            },
            accessToken,
            refreshToken
        });

    } catch (err) {
        console.error("Lỗi Google Login:", err);
        res.status(400).json({ message: "Token Google không hợp lệ hoặc lỗi server" });
    }
});

// --- API REFRESH TOKEN GOOGLE ---
app.post("/api/auth/google-login", async (req, res) => {
    const { token } = req.body;
    
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload; 

        let user = null;
        let userType = 'user'; 
        let table = 'users';   
        let role = 'customer';

        // Check bảng users
        const [usersList] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (usersList.length > 0) {
            user = usersList[0];
            if (!user.avatar) {
                await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [picture, user.id]);
                user.avatar = picture;
            }
        } else {
            // Check bảng admins
            const [adminsList] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
            if (adminsList.length > 0) {
                user = adminsList[0];
                table = 'admins';
                userType = 'admin'; 
                role = user.role || 'admin'; 
            }
        }

        // Nếu chưa có -> Tạo User mới (Khách hàng)
        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const sqlInsert = `INSERT INTO users (name, email, password, avatar, phone, gender) VALUES (?, ?, ?, ?, '', 'Khác')`;
            const [result] = await pool.query(sqlInsert, [name, email, hashedPassword, picture]);
            
            const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
            user = newUser[0];
            
            await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, 3)", [user.id]);
        }

        // Tạo Token JWT 
        const accessToken = jwt.sign(
            { id: user.id, type: userType, role: role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        const refreshToken = jwt.sign(
            { id: user.id, type: userType }, 
            process.env.JWT_REFRESH_SECRET, 
            { expiresIn: '7d' }
        );

        // Lưu refresh token vào DB
        await pool.query(`UPDATE ${table} SET refresh_token = ? WHERE id = ?`, [refreshToken, user.id]);

        res.json({
            message: "Đăng nhập Google thành công",
            user: { 
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                type: userType // Trả về type đúng cho Frontend dùng
            },
            accessToken,
            refreshToken
        });

    } catch (err) {
        console.error("Lỗi Google Login:", err);
        res.status(400).json({ message: "Token Google không hợp lệ hoặc lỗi server" });
    }
});

// --- API REFRESH TOKEN ---
app.post(["/api/auth/refresh-token", "/api/admin/refresh-token"], async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh Token is required" });

    try {
        // 1. Giải mã Refresh Token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        // 2. Xác định bảng cần query
        const table = decoded.type === 'admin' ? 'admins' : 'users';
        
        // 3. Kiểm tra user trong DB
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? AND refresh_token = ?`, [decoded.id, refreshToken]);
        
        if (rows.length === 0) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã đăng xuất" });
        }

        const user = rows[0];
        let roleNames = [];

        // LẤY LẠI QUYỀN (ROLES) DẠNG MẢNG ---
        if (decoded.type === 'admin') {
            const [roleRows] = await pool.query(`
                SELECT r.name 
                FROM roles r 
                JOIN admin_roles ar ON ar.role_id = r.id 
                WHERE ar.admin_id = ?
            `, [user.id]);
            roleNames = roleRows.map(r => r.name); // : ['admin', 'staff']
        } else {
            const [roleRows] = await pool.query(`
                SELECT r.name 
                FROM roles r 
                JOIN user_roles ur ON ur.role_id = r.id 
                WHERE ur.user_id = ?
            `, [user.id]);
            roleNames = roleRows.map(r => r.name);
        }

        // Fallback: Nếu là admin mà lỡ chưa gán quyền trong DB thì gán tạm để không lỗi
        if (decoded.type === 'admin' && roleNames.length === 0) {
             roleNames = ['admin'];
        }

        // 4. Ký Access Token MỚI
        const newAccessToken = jwt.sign(
            { 
                id: user.id, 
                roles: roleNames, // <--- Middleware authorizeRoles cần cái này là Array
                type: decoded.type // <--- Middleware authenticateJWT cần cái này là 'admin'/'staff'
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(`Refresh Success: ${user.email} | Type: ${decoded.type} | Roles: ${roleNames}`);
        
        res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error("Lỗi Refresh Token:", err);
        res.status(403).json({ message: "Token hết hạn hoặc không hợp lệ" });
    }
});

// Logout
app.post("/api/auth/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        await pool.query("UPDATE users SET refresh_token=NULL WHERE refresh_token=?", [refreshToken]);
        await pool.query("UPDATE admins SET refresh_token=NULL WHERE refresh_token=?", [refreshToken]);
    }
    res.json({ message: "Đăng xuất thành công" });
});

// API QUÊN MẬT KHẨU (Gửi Link Reset qua Email)
app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Vui lòng nhập email!" });

    try {
        // 1. Kiểm tra email có tồn tại không (Tìm cả bảng Users và Admins)
        let user = null;
        let roleTable = 'users'; // Mặc định là user

        // Tìm trong bảng users trước
        const [usersList] = await pool.query("SELECT id, name, email FROM users WHERE email = ?", [email]);
        if (usersList.length > 0) {
            user = usersList[0];
        } else {
            // Nếu không có, tìm trong bảng admins
            const [adminsList] = await pool.query("SELECT id, name, email FROM admins WHERE email = ?", [email]);
            if (adminsList.length > 0) {
                user = adminsList[0];
                roleTable = 'admins';
            }
        }

        if (!user) {
            return res.status(404).json({ message: "Email này chưa được đăng ký!" });
        }

        // 2. Tạo Token Reset (Dùng JWT, hạn 15 phút)
        // Payload chứa ID và Bảng (để biết là user hay admin khi reset)
        const resetToken = jwt.sign(
            { id: user.id, type: roleTable }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        // 3. Tạo Link Reset (Trỏ về Frontend)
        // Ví dụ: http://localhost:3000/reset-password?token=...
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        // 4. Gửi Email
        const mailOptions = {
            from: '"MovieBooking Support" <no-reply@moviebooking.com>',
            to: email,
            subject: 'Yêu cầu đặt lại mật khẩu',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #d63384;">Xin chào ${user.name},</h2>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>${email}</strong>.</p>
                    <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu mới (Link có hiệu lực trong 15 phút):</p>
                    
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #d63384; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 10px 0;">
                        Đặt Lại Mật Khẩu
                    </a>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        Nếu bạn không yêu cầu thay đổi, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`Đã gửi link reset cho ${email}`);
        res.json({ message: "Đã gửi link reset mật khẩu vào email của bạn!" });

    } catch (err) {
        console.error("Lỗi gửi mail:", err);
        res.status(500).json({ message: "Lỗi server khi gửi email. Vui lòng thử lại sau." });
    }
});

// API ĐẶT LẠI MẬT KHẨU (Khi user nhập mật khẩu mới)
app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // 1. Xác thực Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { id, type } = decoded; // type là 'users' hoặc 'admins'

        // 2. Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 3. Cập nhật vào DB (đúng bảng)
        if (type === 'users') {
            await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);
        } else if (type === 'admins') {
            await pool.query("UPDATE admins SET password = ? WHERE id = ?", [hashedPassword, id]);
        } else {
            return res.status(400).json({ message: "Loại tài khoản không hợp lệ" });
        }

        res.json({ message: "Đặt lại mật khẩu thành công! Hãy đăng nhập ngay." });

    } catch (err) {
        console.error("Lỗi reset pass:", err);
        if (err.name === 'TokenExpiredError') {
            return res.status(400).json({ message: "Link đã hết hạn! Vui lòng yêu cầu lại." });
        }
        res.status(400).json({ message: "Link không hợp lệ hoặc đã được sử dụng." });
    }
});

// --- API LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (DÙNG CHO F5) ---
app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = null;
        
        if (decoded.type === 'user') {
             // THÊM 'points' VÀO CÂU SELECT
             const [users] = await pool.query("SELECT id, name, email, avatar, phone, birth_date, gender, points FROM users WHERE id=?", [decoded.id]);
             if (users.length) user = users[0];
        } else {
             const [admins] = await pool.query("SELECT id, name, email FROM admins WHERE id=?", [decoded.id]);
             if (admins.length) user = admins[0];
        }

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

        res.json({
            user: { 
                ...user, 
                type: decoded.type,
                roles: decoded.roles || []
            } 
        });

    } catch (err) {
        return res.status(403).json({ message: "Token không hợp lệ" });
    }
});


// ============================================================
// 5. ADMIN ROUTES - QUẢN LÝ RẠP
// ============================================================
// Lấy danh sách rạp
app.get("/api/admin/theaters", authenticateJWT("admin"), authorizeRoles("admin", "staff"), handleGetAll("theaters"));

// HÀM HỖ TRỢ SINH GHẾ TỰ ĐỘNG
const generateSeats = async (connection, theaterId, totalSeats) => {
    // Logic: <= 80 ghế chia 10 cột, > 80 chia 15 cột
    let seatsPerRow = totalSeats <= 80 ? 10 : 15;
    const totalRows = Math.ceil(totalSeats / seatsPerRow);
    const seatValues = [];
    let count = 0;

    for (let r = 0; r < totalRows; r++) {
        const rowLabel = String.fromCharCode(65 + r); // A, B, C...
        for (let c = 1; c <= seatsPerRow; c++) {
            if (count >= totalSeats) break;
            
            const seatLabel = `${rowLabel}${c}`;
            // Logic loại ghế: Hàng cuối (3-Couple), 2 hàng sát cuối (2-VIP), còn lại (1-Normal)
            let typeId = 1;
            if (r === totalRows - 1) typeId = 3; 
            else if (r >= totalRows - 3) typeId = 2;

            seatValues.push([theaterId, seatLabel, typeId, 0]);
            count++;
        }
    }

    if (seatValues.length > 0) {
        await connection.query(
            `INSERT INTO seats (theater_id, seat_number, seat_type_id, status) VALUES ?`, 
            [seatValues]
        );
    }
};

// Tạo rạp mới (Kèm tạo ghế)
app.post("/api/admin/theaters", authenticateJWT("admin"), authorizeRoles("admin"), async (req, res) => {
    const { name, total_seats, brand_id, location } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            "INSERT INTO theaters (name, total_seats, brand_id, location) VALUES (?, ?, ?, ?)",
            [name, total_seats, brand_id, location]
        );
        
        // Tạo ghế tự động
        await generateSeats(connection, result.insertId, total_seats);

        await connection.commit();
        res.status(201).json({ message: "Tạo rạp và ghế thành công", id: result.insertId });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Lỗi khi tạo rạp" });
    } finally {
        connection.release();
    }
});

// Cập nhật rạp (Kèm xóa ghế cũ và tạo ghế mới)
app.put("/api/admin/theaters/:id", authenticateJWT("admin"), authorizeRoles("admin"), async (req, res) => {
    const { id } = req.params;
    const { name, total_seats, brand_id, location } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update bảng theaters
        await connection.query(
            "UPDATE theaters SET name=?, total_seats=?, brand_id=?, location=? WHERE id=?",
            [name, total_seats, brand_id, location, id]
        );

        // 2. Xóa sạch ghế cũ
        await connection.query("DELETE FROM seats WHERE theater_id=?", [id]);

        // 3. Tạo lại ghế mới theo số lượng mới
        await generateSeats(connection, id, total_seats);

        await connection.commit();
        res.json({ message: "Cập nhật rạp và sơ đồ ghế thành công" });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Lỗi khi cập nhật rạp" });
    } finally {
        connection.release();
    }
});

// Xóa rạp
app.delete("/api/admin/theaters/:id", authenticateJWT("admin"), authorizeRoles("admin"), handleDelete("theaters"));


// 6. ADMIN ROUTES - QUẢN LÝ PHIM & VÉ (LOGIC RIÊNG)
// Movies (Xử lý genre)
app.get("/api/admin/movies", authenticateJWT("admin"), handleGetAll("movies"));
app.post("/api/admin/movies", authenticateJWT("admin"), authorizeRoles("admin"), 
    handleCreate("movies", {
        excludeKeys: ["genre_ids"],
        callback: async (movieId, data) => {
            if (data.genre_ids?.length > 0) {
                const values = data.genre_ids.map(gid => [movieId, gid]);
                await pool.query("INSERT INTO movie_genres (movie_id, genre_id) VALUES ?", [values]);
            }
        }
    })
);
app.put("/api/admin/movies/:id", authenticateJWT("admin"), authorizeRoles("admin"), 
    handleUpdate("movies", {
        excludeKeys: ["genre_ids"],
        callback: async (movieId, data) => {
            await pool.query("DELETE FROM movie_genres WHERE movie_id=?", [movieId]);
            if (data.genre_ids?.length > 0) {
                const values = data.genre_ids.map(gid => [movieId, gid]);
                await pool.query("INSERT INTO movie_genres (movie_id, genre_id) VALUES ?", [values]);
            }
        }
    })
);
app.delete("/api/admin/movies/:id", authenticateJWT("admin"), authorizeRoles("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM movie_genres WHERE movie_id=?", [req.params.id]);
        await pool.query("DELETE FROM movies WHERE id=?", [req.params.id]);
        res.json({ message: "Xóa phim thành công" });
    } catch(err) { res.status(500).json({message: "Lỗi xóa phim"}); }
});

// Tickets (Xử lý combo)
// --- API ADMIN: Lấy danh sách tất cả vé---
app.get("/api/admin/tickets", authenticateJWT("admin"), async (req, res) => {
    try {
        const sql = `
            SELECT 
                t.id, 
                t.price, 
                t.status, 
                t.booking_date,
                u.name as user_name, 
                u.email as user_email,
                m.title as movie_title,
                m.poster_url,  -- <--- THÊM DÒNG NÀY ĐỂ LẤY POSTER
                th.name as theater_name,
                s.seat_number,
                st.show_date,
                st.show_time
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN showtimes st ON t.showtime_id = st.id
            LEFT JOIN movies m ON st.movie_id = m.id
            LEFT JOIN theaters th ON st.theater_id = th.id
            LEFT JOIN seats s ON t.seat_id = s.id
            ORDER BY t.booking_date DESC
        `;
        const [tickets] = await pool.query(sql);
        res.json(tickets);
    } catch (err) {
        console.error("Lỗi lấy danh sách vé:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});
app.delete("/api/admin/tickets/:id", authenticateJWT("admin"), authorizeRoles("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM ticket_combos WHERE ticket_id=?", [req.params.id]);
        await pool.query("DELETE FROM tickets WHERE id=?", [req.params.id]);
        res.json({ message: "Xóa vé thành công" });
    } catch(err) { res.status(500).json({message: "Lỗi xóa vé"}); }
});


// 7. ADMIN ROUTES - CÁC BẢNG ĐƠN GIẢN (GENERIC)
const simpleTables = ["showtimes", "brands", "combos", "reviews"];
simpleTables.forEach(table => {
    app.get(`/api/admin/${table}`, authenticateJWT("admin"), handleGetAll(table));
    app.post(`/api/admin/${table}`, authenticateJWT("admin"), authorizeRoles("admin"), handleCreate(table));
    app.put(`/api/admin/${table}/:id`, authenticateJWT("admin"), authorizeRoles("admin"), handleUpdate(table));
    app.delete(`/api/admin/${table}/:id`, authenticateJWT("admin"), authorizeRoles("admin"), handleDelete(table));
});

app.get("/api/admin/users", authenticateJWT("admin"), authorizeRoles("admin", "staff"), async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, name, email, phone FROM users"); 

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi lấy danh sách người dùng" });
    }
});

// API ADMIN Tạo bài viết mới 
app.post("/api/admin/blogs", authenticateJWT("admin"), authorizeRoles("admin", "staff"), async (req, res) => {
    try {
        const { title, thumbnail_url, content } = req.body;
        
        // Lấy ID của admin đang đăng nhập từ token
        const adminId = req.user.id; 
        const authorName = req.user.name || "Admin"; // Lấy tên admin

        // Validate dữ liệu
        if (!title || !content) {
            return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung" });
        }

        const sql = `
            INSERT INTO blogs (title, thumbnail_url, content, author_name, admin_id, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        await pool.query(sql, [title, thumbnail_url, content, authorName, adminId]);

        res.status(201).json({ message: "Đăng bài viết thành công!" });

    } catch (err) {
        console.error("Lỗi tạo blog:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// --- API ADMIN CẬP NHẬT BÀI VIẾT ---
app.put("/api/admin/blogs/:id", authenticateJWT("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, thumbnail_url, content, author_name } = req.body;

        if (!title || !content || !author_name) {
            return res.status(400).json({ message: "Tiêu đề, tác giả và nội dung không được để trống!" });
        }

        const sql = "UPDATE blogs SET title = ?, thumbnail_url = ?, content = ?, author_name = ? WHERE id = ?";
        await pool.query(sql, [title, thumbnail_url, content, author_name, id]);

        res.json({ message: "Cập nhật bài viết thành công!" });

    } catch (err) {
        console.error("Lỗi cập nhật blog:", err);
        res.status(500).json({ message: "Lỗi server khi cập nhật blog" });
    }
});

// --- API ADMIN Xóa Blog ---
app.delete("/api/admin/blogs/:id", authenticateJWT("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM blogs WHERE id = ?", [req.params.id]);
        res.json({ message: "Đã xóa bài viết" });
    } catch (err) { res.status(500).json({ message: "Lỗi server" }); }
});

// API ADMIN Thêm khuyến mãi mới
app.post("/api/admin/promotions", authenticateJWT("admin"), async (req, res) => {
    try {
        const { 
            title, image_url, description, content, 
            code, discount_percent, start_date, end_date 
        } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Vui lòng nhập tiêu đề!" });
        }

        // Mã code: Nếu không nhập thì tự sinh, nếu nhập thì dùng
        const finalCode = code || ("PROMO" + Date.now()); 

        const sql = `
            INSERT INTO promotions 
            (title, image_url, description, content, code, discount_percent, start_date, end_date, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `;
        
        await pool.query(sql, [
            title, 
            image_url, 
            description, 
            content, 
            finalCode, 
            discount_percent || 0,
            start_date || null,
            end_date || null
        ]);
        
        res.status(201).json({ message: "Thêm khuyến mãi thành công!" });

    } catch (err) {
        console.error("Lỗi thêm khuyến mãi:", err);
        res.status(500).json({ message: "Lỗi server: " + err.message });
    }
});

// API ADMIN Xóa khuyến mãi
app.delete("/api/admin/promotions/:id", authenticateJWT("admin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM promotions WHERE id = ?", [req.params.id]);
        res.json({ message: "Đã xóa thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// --- API ADMIN: Cập nhật khuyến mãi ---
app.put("/api/admin/promotions/:id", authenticateJWT("admin"), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, image_url, code, description, content, 
            discount_percent, start_date, end_date, is_active 
        } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Tiêu đề không được để trống!" });
        }

        const sql = `
            UPDATE promotions 
            SET title = ?, image_url = ?, code = ?, description = ?, 
                content = ?, discount_percent = ?, start_date = ?, end_date = ?, is_active = ?
            WHERE id = ?
        `;
        
        await pool.query(sql, [
            title, 
            image_url, 
            code, 
            description, 
            content, 
            discount_percent || 0,
            start_date || null,
            end_date || null,
            is_active !== undefined ? is_active : 1,
            id
        ]);
        
        res.json({ message: "Cập nhật khuyến mãi thành công!" });

    } catch (err) {
        console.error("Lỗi cập nhật khuyến mãi:", err);
        res.status(500).json({ message: "Lỗi server: " + err.message });
    }
});

// --- API ADMIN: Lấy danh sách thanh toán ---
app.get("/api/admin/payments", authenticateJWT("admin"), async (req, res) => {
    try {
        // Lấy từ bảng BOOKINGS để xem được cả trạng thái PENDING
        const sql = `
            SELECT 
                b.id as booking_id,
                b.total_price as amount,
                b.status,
                b.created_at,  
                b.payment_method, 
                u.name as user_name, 
                u.email as user_email,
                m.title as movie_title,
                th.name as theater_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN showtimes st ON b.showtime_id = st.id
            LEFT JOIN movies m ON st.movie_id = m.id
            LEFT JOIN theaters th ON st.theater_id = th.id
            ORDER BY b.created_at DESC
        `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (err) {
        console.error("Lỗi lấy danh sách đơn hàng:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// --- API ADMIN: Xóa đơn hàng (Hủy đơn) ---
app.delete("/api/admin/payments/:id", authenticateJWT("admin"), async (req, res) => {
    try {
        const { id } = req.params; // id này là booking_id
        
        // 1. Xóa chi tiết ghế trước (booking_details)
        await pool.query("DELETE FROM booking_details WHERE booking_id = ?", [id]);
        
        // 2. Xóa thanh toán liên quan (nếu có)
        // await pool.query("DELETE FROM payments WHERE ticket_id IN (SELECT id FROM tickets WHERE ...)"); // Hơi phức tạp, tạm bỏ qua nếu chưa cần thiết
        
        // 3. Xóa đơn hàng
        await pool.query("DELETE FROM bookings WHERE id = ?", [id]);
        
        res.json({ message: "Đã xóa đơn hàng" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server khi xóa" });
    }
});

// API ADMIN up ảnh lên cloudinary
app.post('/api/upload',authenticateJWT("admin"), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Chưa chọn file ảnh!" });
    }

    // Upload lên Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "movie_booking",
      use_filename: true
    });

    // Xóa file tạm
    fs.unlinkSync(req.file.path);

    res.json({ 
      url: result.secure_url, 
      message: "Upload thành công!" 
    });

  } catch (error) {
    console.error("Lỗi upload:", error);
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Lỗi server khi upload ảnh" });
  }
});

// API ADMIN LÂY THỐNG KÊ DOANH THU
app.get("/api/admin/stats", authenticateJWT("admin"), async (req, res) => {
    try {
        // Lấy năm từ query params, mặc định là năm hiện tại
        const year = req.query.year || new Date().getFullYear();

        // 1. TỔNG QUAN (Cards)
        // Tổng doanh thu năm (Chỉ tính đơn đã thanh toán thành công)
        const [totalRev] = await pool.query(
            "SELECT SUM(amount) as total FROM payments WHERE status = 'Success' AND YEAR(created_at) = ?", 
            [year]
        );

        // Tổng số vé bán ra trong năm (PAID hoặc CHECKED_IN)
        const [totalTickets] = await pool.query(
            "SELECT COUNT(*) as count FROM tickets WHERE status IN ('PAID', 'CHECKED_IN') AND YEAR(booking_date) = ?", 
            [year]
        );

        // Tổng thành viên
        const [totalUsers] = await pool.query("SELECT COUNT(*) as count FROM users");

        // 2. DOANH THU THEO THÁNG (Line Chart)
        // Group by tháng để vẽ biểu đồ đường
        const [monthlyRevenue] = await pool.query(`
            SELECT MONTH(created_at) as month, SUM(amount) as total 
            FROM payments 
            WHERE status = 'Success' AND YEAR(created_at) = ?
            GROUP BY MONTH(created_at)
            ORDER BY month
        `, [year]);

        // Tạo mảng đủ 12 tháng (để biểu đồ không bị đứt đoạn nếu tháng đó 0đ)
        const fullMonths = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const found = monthlyRevenue.find(item => item.month === m);
            return { month: m, total: found ? Number(found.total) : 0 };
        });

        // 3. TOP 5 PHIM BÁN CHẠY (Bar Chart)
        // Join Tickets -> Showtimes -> Movies để đếm số vé theo phim
        const [topMovies] = await pool.query(`
            SELECT m.title, COUNT(t.id) as ticket_count
            FROM tickets t
            JOIN showtimes st ON t.showtime_id = st.id
            JOIN movies m ON st.movie_id = m.id
            WHERE t.status IN ('PAID', 'CHECKED_IN') AND YEAR(t.booking_date) = ?
            GROUP BY m.id, m.title
            ORDER BY ticket_count DESC
            LIMIT 5
        `, [year]);

        // 4. DOANH THU THEO RẠP (Doughnut Chart)
        // Join Payments -> Tickets -> Showtimes -> Theaters để tính tiền theo rạp
        const [revenueByTheater] = await pool.query(`
            SELECT th.name, SUM(p.amount) as total
            FROM payments p
            JOIN tickets t ON p.ticket_id = t.id
            JOIN showtimes st ON t.showtime_id = st.id
            JOIN theaters th ON st.theater_id = th.id
            WHERE p.status = 'Success' AND YEAR(p.created_at) = ?
            GROUP BY th.id, th.name
        `, [year]);

        // Trả về kết quả tổng hợp
        res.json({
            summary: {
                totalRevenue: Number(totalRev[0].total) || 0,
                totalTickets: Number(totalTickets[0].count) || 0,
                totalUsers: Number(totalUsers[0].count) || 0
            },
            monthlyRevenue: fullMonths,
            topMovies,
            revenueByTheater
        });

    } catch (err) {
        console.error("Lỗi thống kê:", err);
        res.status(500).json({ message: "Lỗi server khi lấy thống kê" });
    }
});

// API ADMIN: SOÁT VÉ (CHECK-IN)
app.post("/api/admin/verify-ticket", authenticateJWT("admin","staff"), async (req, res) => {
    try {
        const { ticketId } = req.body;

        const sql = `
            SELECT 
                t.id, t.status, t.seat_id, t.booking_date,
                m.title as movie_title, 
                th.name as theater_name,
                s.seat_number,
                st.show_date, st.show_time,
                u.name as user_name
            FROM tickets t
            JOIN showtimes st ON t.showtime_id = st.id
            JOIN movies m ON st.movie_id = m.id
            JOIN theaters th ON st.theater_id = th.id
            JOIN seats s ON t.seat_id = s.id
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `;
        
        const [tickets] = await pool.query(sql, [ticketId]);

        if (tickets.length === 0) {
            return res.status(404).json({ valid: false, message: "Vé không tồn tại!" });
        }

        const ticket = tickets[0];

        // --- LOGIC MỚI: KIỂM TRA THỜI GIAN ---
        // Tạo đối tượng Date cho suất chiếu
        const showDateTime = new Date(ticket.show_date); // Lấy ngày
        const timeString = ticket.show_time.toString(); // "14:30:00"
        const [hours, minutes] = timeString.split(':');
        showDateTime.setHours(hours, minutes, 0); // Set giờ phút

        const now = new Date();
        // Cho phép vào trễ 30 phút sau khi phim chiếu
        const limitTime = new Date(showDateTime.getTime() + 30 * 60000); 

        if (ticket.status !== 'CHECKED_IN' && now > limitTime) {
             return res.status(400).json({ 
                 valid: false, 
                 message: "CẢNH BÁO: Suất chiếu đã kết thúc!", 
                 ticket: { ...ticket, status: 'EXPIRED' } // Trả về trạng thái ảo để hiển thị
             });
        }
        // -------------------------------------

        // Kiểm tra trạng thái cũ
        if (ticket.status === 'CHECKED_IN') {
            return res.status(400).json({ valid: false, message: "Vé này đã được sử dụng rồi!", ticket });
        }
        
        if (ticket.status === 'CANCELLED') {
            return res.status(400).json({ valid: false, message: "Vé này đã bị hủy!", ticket });
        }

        if (ticket.status === 'PENDING') {
             return res.status(400).json({ valid: false, message: "Vé chưa thanh toán xong!", ticket });
        }

        // Update thành CHECKED_IN
        await pool.query("UPDATE tickets SET status = 'CHECKED_IN' WHERE id = ?", [ticketId]);

        res.json({ 
            valid: true, 
            message: "Vé hợp lệ. Mời khách vào rạp.", 
            ticket: { ...ticket, status: 'CHECKED_IN' } 
        });

    } catch (err) {
        console.error("Lỗi soát vé:", err);
        res.status(500).json({ message: "Lỗi server khi soát vé" });
    }
});



// ============================================================
// 8. USER API - CÔNG KHAI (PUBLIC)
// ============================================================
// Lấy danh sách Brand & Showtimes
app.get("/api/brands", handleGetAll("brands"));
app.get("/api/brands/:id", async (req, res) => {
    const [rows] = await pool.query("SELECT id, name, logo FROM brands WHERE id=?", [req.params.id]);
    res.json(rows[0] || {});
});
app.get("/api/brands/:id/branches", async (req, res) => {
    const [rows] = await pool.query("SELECT id, name, location FROM theaters WHERE brand_id=?", [req.params.id]);
    res.json(rows);
});
app.get("/api/theaters", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, b.name AS brand_name, b.logo AS brand_logo
      FROM theaters t
      LEFT JOIN brands b ON t.brand_id = b.id
      ORDER BY t.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách rạp" });
  }
});

// Movies Public APIs
app.get("/api/movies", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, c.name AS country, GROUP_CONCAT(g.name SEPARATOR ', ') AS genres,
            CASE WHEN m.release_date > NOW() THEN 1 ELSE 0 END AS is_upcoming
            FROM movies m
            LEFT JOIN countries c ON m.country_id = c.id
            LEFT JOIN movie_genres mg ON mg.movie_id = m.id
            LEFT JOIN genres g ON mg.genre_id = g.id
            GROUP BY m.id ORDER BY m.release_date DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({message: "Lỗi tải phim"}); }
});
app.get("/api/movies/now_showing", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM movies WHERE release_date <= NOW() ORDER BY release_date DESC");
    res.json(rows);
});
app.get("/api/movies/upcoming", async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM movies WHERE release_date > NOW() ORDER BY release_date ASC");
    res.json(rows);
});
// API: bộ lọc phim
app.get("/api/movies/filter", async (req, res) => {
    try {
        // 1. Lấy tham số từ URL (Frontend gửi lên)
        const { country_id, genre_id, is_upcoming } = req.query;
        
        // 2. Viết câu SQL cơ bản: Lấy phim + Tên quốc gia + Chuỗi thể loại
        // Lưu ý: Dùng subquery lấy genres để tránh bị duplicate dòng khi join
        let sql = `
            SELECT m.*, c.name as country_name, 
            (
                SELECT GROUP_CONCAT(g.name SEPARATOR ', ')
                FROM movie_genres mg
                JOIN genres g ON mg.genre_id = g.id
                WHERE mg.movie_id = m.id
            ) as genres
            FROM movies m
            LEFT JOIN countries c ON m.country_id = c.id
            WHERE 1=1
        `;
        
        const params = [];

        // 3. Xử lý từng điều kiện lọc
        
        // --- Lọc theo Quốc gia ---
        if (country_id) {
            sql += " AND m.country_id = ?";
            params.push(country_id);
        }

        // --- Lọc theo Thể loại (Quan trọng) ---
        // Dùng EXISTS để tìm phim có chứa genre_id này
        if (genre_id) {
            sql += ` AND EXISTS (
                SELECT 1 FROM movie_genres mg_check 
                WHERE mg_check.movie_id = m.id AND mg_check.genre_id = ?
            )`;
            params.push(genre_id);
        }

        // --- Lọc theo Trạng thái (Sắp chiếu / Đang chiếu) ---
        if (is_upcoming !== undefined && is_upcoming !== "") {
            if (is_upcoming === '1') {
                // Sắp chiếu: Ngày phát hành > Hôm nay
                sql += " AND m.release_date > CURDATE()";
            } else if (is_upcoming === '0') {
                // Đang chiếu: Ngày phát hành <= Hôm nay
                sql += " AND m.release_date <= CURDATE()";
            }
        }

        // 4. Sắp xếp và thực thi
        sql += " ORDER BY m.release_date DESC";

        const [movies] = await pool.query(sql, params);
        res.json(movies);

    } catch (err) {
        console.error("Lỗi lọc phim:", err);
        res.status(500).json({ message: "Lỗi server khi lọc phim" });
    }
});

app.get("/api/movies/:id", async (req, res) => { 
    try {
        const [rows] = await pool.query(`
          SELECT 
            m.id, m.title, m.description, m.duration, m.rating,
            m.poster_url AS poster, m.trailer_url, m.release_date,
            m.production_year, c.name AS country,
            GROUP_CONCAT(g.name SEPARATOR ', ') AS genres
          FROM movies m
          LEFT JOIN countries c ON m.country_id = c.id
          LEFT JOIN movie_genres mg ON mg.movie_id = m.id
          LEFT JOIN genres g ON mg.genre_id = g.id
          WHERE m.id = ?
          GROUP BY m.id
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({message: "Không tìm thấy phim"});
        res.json(rows[0]);
    } catch (err) { res.status(500).json({message: "Lỗi tải phim"}); }
});

// Lấy lịch chiếu public
app.get("/api/showtimes", async (req, res) => {
    const [rows] = await pool.query(`
        SELECT s.*, m.title as movie, m.poster_url, t.name as theater 
        FROM showtimes s 
        JOIN movies m ON s.movie_id=m.id 
        JOIN theaters t ON s.theater_id=t.id 
        WHERE s.show_date >= CURDATE() ORDER BY s.show_date, s.show_time
    `);
    res.json(rows);
});

// API: lấy lịch chiếu theo id
app.get("/api/showtimes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [showtimeRows] = await pool.query(`
            SELECT st.*, m.title as movie_title, th.name as theater_name 
            FROM showtimes st
            JOIN movies m ON st.movie_id = m.id
            JOIN theaters th ON st.theater_id = th.id
            WHERE st.id = ?
        `, [id]);

        if (showtimeRows.length === 0) return res.status(404).json({ message: "Không tìm thấy suất chiếu" });
        const showtime = showtimeRows[0];

        const sqlSeats = `
            SELECT 
                s.*,
                (t.id IS NOT NULL) as is_sold, -- Ghế đã bán thật
                (sh.id IS NOT NULL) as is_held, -- Ghế đang bị giữ
                sh.user_id as hold_by_user_id,  -- Ai là người giữ
                sh.expired_at as hold_expires   -- Thời gian hết hạn
            FROM seats s
            LEFT JOIN tickets t ON s.id = t.seat_id AND t.showtime_id = ? AND t.status != 'CANCELLED'
            LEFT JOIN seat_hold sh ON s.id = sh.seat_id AND sh.showtime_id = ? AND sh.expired_at > NOW()
            WHERE s.room_id = ? -- Giả sử showtime có room_id, hoặc query theo logic của bạn
            ORDER BY s.seat_number ASC
        `;
        
    
        const [seats] = await pool.query(`
            SELECT 
                s.*,
                CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_sold,
                sh.user_id as hold_user_id,
                sh.expired_at
            FROM seats s
            LEFT JOIN tickets t ON s.id = t.seat_id AND t.showtime_id = ? AND t.status IN ('PAID', 'BOOKED')
            LEFT JOIN seat_hold sh ON s.id = sh.seat_id AND sh.showtime_id = ? AND sh.expired_at > NOW()
            WHERE s.theater_id = ? -- Hoặc s.room_id = ?
        `, [id, id, showtime.theater_id]);

        res.json({ ...showtime, seats });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// API: Lấy danh sách quốc gia (Public)
app.get("/api/countries", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, name FROM countries ORDER BY name ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải quốc gia" });
    }
});

// API: Lấy danh sách thể loại (Public)
app.get("/api/genres", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, name FROM genres ORDER BY name ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Lỗi tải thể loại" });
    }
});

// Combos & Reviews public
app.get("/api/combos", handleGetAll("combos"));
app.get("/api/movies/:movieId/reviews", async (req, res) => {
    const [rows] = await pool.query(`SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id=u.id WHERE movie_id=? ORDER BY created_at DESC`, [req.params.movieId]);
    res.json(rows);
});

// Contact
app.post("/api/contact", async (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !phone || !subject || !message) {
        return res.status(400).json({ message: "Thiếu thông tin" });
    }

    try {
        // 1. Lưu vào Database
        await pool.query(
            "INSERT INTO contacts (name, email, phone, subject, message) VALUES (?,?,?,?,?)", 
            [name, email, phone, subject, message]
        );

        // 2. Gửi Email xác nhận cho người dùng
        const mailOptions = {
            from: '"MovieBooking Support" <no-reply@moviebooking.com>',
            to: email, // Gửi đến email người liên hệ
            subject: `[MovieBooking] Chúng tôi đã nhận được liên hệ: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d63384; text-align: center;">Cảm ơn bạn đã liên hệ!</h2>
                    <p>Xin chào <strong>${name}</strong>,</p>
                    <p>Cảm ơn bạn đã gửi tin nhắn cho chúng tôi. Đội ngũ hỗ trợ của MovieBooking đã nhận được thông tin và sẽ phản hồi bạn sớm nhất có thể.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #333;">Nội dung tin nhắn của bạn:</h4>
                        <p style="color: #555; font-style: italic;">"${message}"</p>
                    </div>

                    <p>Trong lúc chờ đợi, bạn có thể tham khảo các bộ phim đang chiếu hot nhất tại website của chúng tôi.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:3000" style="background-color: #d63384; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Quay lại Trang Chủ</a>
                    </div>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        Đây là email tự động, vui lòng không trả lời email này.<br>
                        Hotline: 1900 1234 | Email: support@moviebooking.com
                    </p>
                </div>
            `
        };

        // Gửi mail (Không cần await để tránh làm user phải chờ lâu, hoặc await nếu muốn chắc chắn mail đi rồi mới báo thành công)
        await transporter.sendMail(mailOptions);

        res.json({ message: "Gửi liên hệ thành công! Vui lòng kiểm tra email xác nhận." });

    } catch (err) {
        console.error("Lỗi liên hệ:", err);
        // Vẫn trả về thành công nếu lưu DB được nhưng lỗi gửi mail (tùy logic bạn chọn)
        // Hoặc trả về lỗi 500
        res.status(500).json({ message: "Lỗi server khi gửi liên hệ" });
    }
});

// ============================================================
// 9. USER API - CẦN ĐĂNG NHẬP
// ============================================================
// Profile - Lấy thông tin user và lịch sử vé
app.get("/api/user/profile", authenticateUserJWT, async (req, res) => {
    try {
        // 1. Lấy thông tin User
        const [user] = await pool.query("SELECT * FROM users WHERE id=?", [req.user.id]);
        
        // 2. Lấy lịch sử vé + Combo + Status
        const [tickets] = await pool.query(`
            SELECT 
                t.id, 
                t.booking_date, 
                t.status,                
                t.price AS ticket_price,
                
                m.title AS movie_title,
                m.poster_url,
                th.name AS theater_name,
                ss.seat_number,
                s.show_date, 
                s.show_time,
                
                -- Gộp danh sách combo vào 1 dòng (VD: "Bắp (x1), Nước (x2)")
                IFNULL(
                    GROUP_CONCAT(
                        CONCAT(c.name, ' (x', tc.quantity, ')') SEPARATOR ', '
                    ), 
                '') AS combos

            FROM tickets t
            JOIN showtimes s ON t.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN theaters th ON s.theater_id = th.id
            LEFT JOIN seats ss ON t.seat_id = ss.id
            
            -- JOIN để lấy Combo
            LEFT JOIN ticket_combos tc ON t.id = tc.ticket_id
            LEFT JOIN combos c ON tc.combo_id = c.id
            
            WHERE t.user_id = ? 
            GROUP BY t.id   -- Bắt buộc phải có GROUP BY để gộp combo
            ORDER BY t.booking_date DESC
        `, [req.user.id]);

        res.json({ user: user[0], tickets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi lấy thông tin cá nhân" });
    }
});

// --- API USER: Lấy lịch sử đơn hàng (Transaction History) ---
app.get("/api/user/bookings", authenticateUserJWT, async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.id, 
                b.total_price, 
                b.status, 
                b.created_at, 
                b.combos_data,
                m.title as movie_title,
                th.name as theater_name,
                st.show_time,
                st.show_date
            FROM bookings b
            JOIN showtimes st ON b.showtime_id = st.id
            JOIN movies m ON st.movie_id = m.id
            JOIN theaters th ON st.theater_id = th.id
            WHERE b.user_id = ?
            ORDER BY b.id DESC
        `;
        const [bookings] = await pool.query(sql, [req.user.id]);
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// API sửa thông tin cá nhân
app.put("/api/user/profile", authenticateUserJWT, async (req, res) => {
    try {
        const userId = req.user.id; 
        const { name, phone, birth_date, gender, avatar } = req.body;

        const formattedBirthDate = birth_date ? birth_date : null;

        const sql = `
            UPDATE users 
            SET name = ?, phone = ?, birth_date = ?, gender = ?, avatar = ? 
            WHERE id = ?
        `;

        await pool.query(sql, [
            name, 
            phone, 
            formattedBirthDate, 
            gender, 
            avatar, 
            userId
        ]);

        res.json({ message: "Cập nhật thông tin thành công" });

    } catch (err) {
        console.error("Lỗi update profile:", err);
        // Trả về lỗi 500 để Frontend hiển thị thông báo
        res.status(500).json({ message: "Lỗi server khi cập nhật thông tin" });
    }
});
// API Đổi mật khẩu
app.put("/api/user/change-password", authenticateUserJWT, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        // 1. Lấy thông tin user hiện tại từ DB để lấy mật khẩu cũ đã mã hóa
        const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const currentHashPassword = users[0].password;

        // 2. So sánh mật khẩu cũ người dùng nhập vào với mật khẩu trong DB
        // Lưu ý: Nếu bạn không dùng bcrypt mà lưu plain text (không khuyên dùng), hãy so sánh trực tiếp: if (oldPassword !== currentHashPassword)
        const isMatch = await bcrypt.compare(oldPassword, currentHashPassword);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
        }

        // 3. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Cập nhật vào Database
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, userId]);

        res.json({ message: "Đổi mật khẩu thành công!" });

    } catch (err) {
        console.error("Lỗi đổi mật khẩu:", err);
        res.status(500).json({ message: "Lỗi server khi đổi mật khẩu." });
    }
});

// API giữ ghế
app.post("/api/booking/hold", authenticateUserJWT, async (req, res) => {
    const { showtime_id, seats } = req.body; // seats = [id1, id2]
    const userId = req.user.id;
    const expire = new Date(Date.now() + 5 * 60000); // 5 phút

    try {
        const values = seats.map(sid => [showtime_id, sid, userId, expire]);
        await pool.query("INSERT INTO seat_hold (showtime_id, seat_id, user_id, expired_at) VALUES ?", [values]);
        res.json({ message: "Giữ ghế thành công", expire_at: expire });
    } catch (err) {
        res.status(409).json({ message: "Ghế đã bị người khác giữ hoặc đặt" });
    }
});

// --- API: Hủy giữ ghế (Giải phóng ghế khi người dùng bỏ chọn) ---
app.post("/api/booking/release", authenticateUserJWT, async (req, res) => {
    const { showtime_id, seats } = req.body; 
    const userId = req.user.id;

    try {
        // Xóa các dòng trong bảng seat_hold khớp với user và showtime
        await pool.query(
            "DELETE FROM seat_hold WHERE user_id=? AND showtime_id=? AND seat_id IN (?)", 
            [userId, showtime_id, seats]
        );
        res.json({ message: "Đã hủy giữ ghế" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// API xác nhận đặt vé
app.post("/api/booking/confirm", authenticateUserJWT, async (req, res) => {
    const { showtime_id, seats } = req.body;
    const userId = req.user.id;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Check giữ ghế
        const [holds] = await connection.query(
            "SELECT seat_id FROM seat_hold WHERE user_id=? AND showtime_id=? AND seat_id IN (?) AND expired_at > NOW()", 
            [userId, showtime_id, seats]
        );
        if (holds.length !== seats.length) throw new Error("Hết thời gian giữ ghế");

        // Tạo vé
        const values = seats.map(sid => [userId, showtime_id, sid, new Date()]);
        await connection.query("INSERT INTO tickets (user_id, showtime_id, seat_id, created_at) VALUES ?", [values]);
        
        // Xóa giữ ghế
        await connection.query("DELETE FROM seat_hold WHERE user_id=? AND showtime_id=? AND seat_id IN (?)", [userId, showtime_id, seats]);

        await connection.commit();
        res.json({ message: "Đặt vé thành công!" });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ message: err.message || "Lỗi đặt vé" });
    } finally {
        connection.release();
    }
});

// Reviews
app.post("/api/movies/:movieId/reviews", authenticateUserJWT, async (req, res) => {
    const { rating, comment } = req.body;
    await pool.query("INSERT INTO reviews (user_id, movie_id, rating, comment) VALUES (?,?,?,?)", [req.user.id, req.params.movieId, rating, comment]);
    res.json({message: "Đánh giá thành công"});
});

// API: Lấy bình luận nổi bật (Highlights) - BỊ THIẾU ĐOẠN NÀY
app.get("/api/reviews/highlights", async (req, res) => {
    const limit = parseInt(req.query.limit) || 3;
    try {
        const [rows] = await pool.query(`
            SELECT 
                r.id, r.user_id, r.movie_id, r.rating, r.comment, r.created_at,
                m.title AS movie_title,
                m.poster_url AS movie_poster,
                u.name AS user_name
            FROM reviews r
            JOIN movies m ON r.movie_id = m.id
            JOIN users u ON r.user_id = u.id
            WHERE r.rating >= 4
            ORDER BY RAND()
            LIMIT ?
        `, [limit]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi khi lấy bình luận nổi bật" });
    }
});


//============================= API THANH TOÁN !!!! 

// API Đặt vé & Thanh toán (Booking + Payment)
app.post("/api/bookings", authenticateUserJWT, async (req, res) => {
    // Frontend gửi thêm tham số: use_points (true/false)
    const { showtime_id, seats, combos, promotion_id, use_points } = req.body; 
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // --- BƯỚC 1: TÍNH TIỀN VÉ ---
        let totalSeatPrice = 0;
        const seatDetailsToSave = [];

        if (seats && seats.length > 0) {
            const seatIds = seats.map(s => s.id);
            const sqlGetPrices = `
                SELECT s.id as seat_id, s.seat_type_id, st_type.name as type_name, st.base_price, tp.price as custom_price
                FROM seats s
                JOIN showtimes st ON st.id = ?
                JOIN seat_types st_type ON s.seat_type_id = st_type.id
                LEFT JOIN ticket_prices tp ON tp.showtime_id = st.id AND tp.seat_type_id = s.seat_type_id
                WHERE s.id IN (?)
            `;
            const [dbSeats] = await connection.query(sqlGetPrices, [showtime_id, seatIds]);

            if (dbSeats.length !== seatIds.length) throw new Error("Ghế không hợp lệ.");

            for (const seat of dbSeats) {
                let finalPrice = 0;
                if (seat.custom_price) {
                    finalPrice = Number(seat.custom_price);
                } else {
                    let multiplier = 1;
                    const typeName = seat.type_name.toLowerCase(); 
                    if (typeName.includes('vip')) multiplier = 1.2;
                    else if (typeName.includes('couple') || typeName.includes('đôi')) multiplier = 2.0;
                    finalPrice = Math.round(Number(seat.base_price) * multiplier);
                }
                totalSeatPrice += finalPrice;
                seatDetailsToSave.push({ seat_id: seat.seat_id, price: finalPrice });
            }
        }

        // --- BƯỚC 2: TÍNH TIỀN COMBO ---
        let totalComboPrice = 0;
        if (combos && combos.length > 0) {
            const comboIds = combos.map(c => c.id);
            const [dbCombos] = await connection.query("SELECT id, price FROM combos WHERE id IN (?)", [comboIds]);
            for (const item of combos) {
                const dbCombo = dbCombos.find(c => c.id === item.id);
                if (dbCombo) totalComboPrice += Number(dbCombo.price) * item.quantity;
            }
        }

        // --- BƯỚC 3: TÍNH TỔNG & KHUYẾN MÃI (PROMOTION) ---
        let calculatedTotal = totalSeatPrice + totalComboPrice;
        let discountAmount = 0; // Giảm giá từ Coupon

        if (promotion_id) {
            const [promoRows] = await connection.query("SELECT * FROM promotions WHERE id = ? AND is_active = 1", [promotion_id]);
            if (promoRows.length > 0) {
                const promo = promoRows[0];
                const now = new Date();
                const isValidTime = (!promo.start_date || new Date(promo.start_date) <= now) && (!promo.end_date || new Date(promo.end_date) >= now);
                
                if (isValidTime) {
                    discountAmount = (calculatedTotal * Number(promo.discount_percent)) / 100;
                }
            }
        }

        let tempTotal = calculatedTotal - discountAmount; // Giá sau khi trừ Coupon

        // --- BƯỚC 4: XỬ LÝ DÙNG ĐIỂM (POINTS) --- 
        let pointsDiscount = 0; // Tiền giảm từ điểm
        let pointsUsed = 0;     // Số điểm bị trừ

        if (use_points === true) {
            // Lấy số điểm hiện tại của User
            const [userRows] = await connection.query("SELECT points FROM users WHERE id = ?", [req.user.id]);
            const currentPoints = userRows[0]?.points || 0;

            if (currentPoints > 0) {
                // Quy đổi: 1 điểm = 1000 VNĐ
                const maxDiscountByPoints = currentPoints * 1000;

                // Nếu điểm nhiều hơn tiền vé -> Trừ bằng tiền vé (Khách không phải trả tiền)
                if (maxDiscountByPoints >= tempTotal) {
                    pointsDiscount = tempTotal;
                    pointsUsed = Math.ceil(tempTotal / 1000);
                } else {
                    // Nếu điểm ít hơn -> Trừ hết điểm
                    pointsDiscount = maxDiscountByPoints;
                    pointsUsed = currentPoints;
                }
            }
        }

        // Giá cuối cùng khách phải trả qua SePay
        const finalTotal = tempTotal - pointsDiscount;
        const combosString = combos && combos.length > 0 ? JSON.stringify(combos) : null;

        // --- BƯỚC 5: INSERT VÀO DB & TRỪ ĐIỂM ---
        
        // 1. Trừ điểm user (Nếu có dùng)
        if (pointsUsed > 0) {
            await connection.query("UPDATE users SET points = points - ? WHERE id = ?", [pointsUsed, req.user.id]);
        }

        // 2. Tạo Booking
        // Lưu ý: Chúng ta lưu tổng tiền giảm giá (Coupon + Điểm) vào cột discount_amount hoặc tạo cột mới points_discount nếu muốn tách bạch.
        // Ở đây mình cộng dồn vào discount_amount cho đơn giản.
        const [bookingRes] = await connection.query(
            `INSERT INTO bookings 
            (user_id, showtime_id, total_price, discount_amount, promotion_id, combos_data, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
            [
                req.user.id, 
                showtime_id, 
                finalTotal,       // Giá khách phải trả
                discountAmount + pointsDiscount, // Tổng giảm giá (Coupon + Điểm)
                promotion_id || null, 
                combosString
            ]
        );
        const bookingId = bookingRes.insertId;

        // 3. Tạo Booking Details
        if (seatDetailsToSave.length > 0) {
            const values = seatDetailsToSave.map(s => [bookingId, s.seat_id, s.price]);
            await connection.query("INSERT INTO booking_details (booking_id, seat_id, price) VALUES ?", [values]);
        }

        await connection.commit();
        
        res.status(201).json({ 
            message: "Đặt vé thành công, vui lòng thanh toán", 
            bookingId: bookingId, 
            finalTotal: finalTotal, // Frontend dùng số này để tạo QR
            pointsUsed: pointsUsed,
            pointsDiscount: pointsDiscount
        });

    } catch (err) {
        await connection.rollback();
        console.error("Lỗi Booking:", err);
        res.status(500).json({ message: "Lỗi server: " + err.message });
    } finally {
        connection.release();
    }
});

// API KIỂM TRA MÃ KHUYẾN MÃI
app.post("/api/promotions/verify", async (req, res) => {
    try {
        // Frontend cần gửi thêm: user_id (để check khách mới) và quantity (số lượng vé)
        const { code, total_amount, user_id, seat_count } = req.body; 

        // 1. Tìm mã trong DB
        const [rows] = await pool.query(
            "SELECT * FROM promotions WHERE code = ? AND is_active = 1", 
            [code]
        );

        if (rows.length === 0) {
            return res.status(404).json({ valid: false, message: "Mã khuyến mãi không tồn tại!" });
        }

        const promo = rows[0];
        const now = new Date();

        // 2. Kiểm tra thời hạn (Chung cho tất cả)
        if (promo.start_date && new Date(promo.start_date) > now) {
            return res.status(400).json({ valid: false, message: "Chương trình chưa bắt đầu!" });
        }
        if (promo.end_date && new Date(promo.end_date) < now) {
            return res.status(400).json({ valid: false, message: "Mã đã hết hạn sử dụng!" });
        }

        // --- 3. KIỂM TRA ĐIỀU KIỆN RIÊNG CHO TỪNG MÃ ---
        
        // A. Mã "TUESDAY" - Chỉ dùng được vào Thứ 3
        if (code === 'TUESDAY') {
            const dayOfWeek = now.getDay(); // 0 là CN, 1 là T2, 2 là T3...
            if (dayOfWeek !== 2) { // Nếu không phải thứ 3
                return res.status(400).json({ valid: false, message: "Mã này chỉ áp dụng vào ngày Thứ 3!" });
            }
        }

        // B. Mã "WELCOME" - Chỉ dành cho khách chưa từng đặt vé
        if (code === 'WELCOME') {
            if (!user_id) return res.status(400).json({ valid: false, message: "Vui lòng đăng nhập để dùng mã này!" });
            
            // Đếm số đơn hàng thành công cũ của user này
            const [history] = await pool.query(
                "SELECT count(*) as count FROM bookings WHERE user_id = ? AND status = 'PAID'", 
                [user_id]
            );
            
            if (history[0].count > 0) {
                return res.status(400).json({ valid: false, message: "Mã này chỉ dành cho khách hàng mới (lần đầu đặt vé)!" });
            }
        }

        // C. Mã "XMAS2025" - Phải mua từ 2 vé trở lên
        if (code === 'XMAS2025') {
            if (!seat_count || seat_count < 2) {
                return res.status(400).json({ valid: false, message: "Mã này chỉ áp dụng khi mua từ 2 vé trở lên!" });
            }
        }

        // 4. Tính toán số tiền giảm
        let discountAmount = (total_amount * promo.discount_percent) / 100;

        // (Tùy chọn) Giới hạn mức giảm tối đa cho Black Friday (ví dụ max 200k)
        if (code === 'BLACKFRIDAY' && discountAmount > 200000) {
            discountAmount = 200000;
        }

        const finalTotal = total_amount - discountAmount;

        res.json({
            valid: true,
            message: `Áp dụng thành công! Giảm ${promo.discount_percent}%`,
            promotion_id: promo.id,
            discount_percent: promo.discount_percent,
            discount_amount: discountAmount,
            final_total: finalTotal
        });

    } catch (err) {
        console.error("Lỗi check promo:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// LẤY TRẠNG THÁI ĐƠN HÀNG
// Frontend sẽ gọi API này liên tục 2s/lần để check xem status đã thành PAID chưa
app.get("/api/bookings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT id, status, total_price FROM bookings WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        res.json(rows[0]); // Trả về { id: 105, status: "PAID", ... }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// WEBHOOK NHẬN TIỀN TỪ SEPAY (Tự động kích hoạt vé + TÍCH ĐIỂM + gửi mail)
app.post("/api/sepay-webhook", async (req, res) => {
    try {
        const { content } = req.body; 
        const match = content ? content.match(/THANHTOAN\s*(\d+)/i) : null;
        
        if (match) {
            const bookingId = match[1];
            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // 1. Update trạng thái đơn hàng thành PAID
                const [updateRes] = await connection.query(
                    "UPDATE bookings SET status = 'PAID' WHERE id = ? AND status = 'PENDING'", 
                    [bookingId]
                );

                if (updateRes.affectedRows === 0) {
                    await connection.rollback();
                    return res.json({ success: true, message: "Đơn hàng đã xử lý hoặc không tồn tại" });
                }

                // 2. Lấy THÔNG TIN CHI TIẾT đơn hàng (để gửi mail và tạo vé)
                // JOIN thêm các bảng users, movies, theaters, showtimes để lấy tên hiển thị
                const sqlGetInfo = `
                    SELECT 
                        b.*, 
                        u.name as user_name, u.email as user_email,
                        m.title as movie_title, 
                        m.poster_url as movie_poster,
                        th.name as theater_name,
                        st.show_date, st.show_time
                    FROM bookings b
                    JOIN users u ON b.user_id = u.id
                    JOIN showtimes st ON b.showtime_id = st.id
                    JOIN movies m ON st.movie_id = m.id
                    JOIN theaters th ON st.theater_id = th.id
                    WHERE b.id = ?
                `;
                const [bInfo] = await connection.query(sqlGetInfo, [bookingId]);
                const booking = bInfo[0];
                
                // --- TÍCH ĐIỂM ---
                const pointsEarned = Math.floor(booking.total_price / 10000);
                if (pointsEarned > 0) {
                    await connection.query(
                        "UPDATE users SET points = IFNULL(points, 0) + ? WHERE id = ?",
                        [pointsEarned, booking.user_id]
                    );
                }

                // 3. Xử lý tạo vé và combo
                // Lấy chi tiết ghế kèm Số ghế (A1, B2...)
                const [details] = await connection.query(`
                    SELECT bd.*, s.seat_number 
                    FROM booking_details bd
                    JOIN seats s ON bd.seat_id = s.id 
                    WHERE bd.booking_id = ?
                `, [bookingId]);

                let seatNumbers = []; // Lưu danh sách số ghế để gửi mail

                if (details.length > 0 && booking) {
                    let firstTicketId = null;

                    for (let i = 0; i < details.length; i++) {
                        const item = details[i];
                        seatNumbers.push(item.seat_number); 

                        // Tạo Ticket
                        const [tRes] = await connection.query(
                            "INSERT INTO tickets (user_id, showtime_id, seat_id, price, booking_date, status) VALUES (?, ?, ?, ?, NOW(), 'PAID')",
                            [booking.user_id, booking.showtime_id, item.seat_id, item.price]
                        );
                        
                        if (i === 0) firstTicketId = tRes.insertId;

                        // Thêm Combo cho vé (chỉ thêm 1 lần cho vé đầu tiên)
                        if (booking.combos_data && i === 0) {
                            let combosList = [];
                            try { combosList = JSON.parse(booking.combos_data); } catch (e) {}
                            if (combosList && combosList.length > 0) {
                                const comboValues = combosList.map(c => [tRes.insertId, c.id, c.quantity]);
                                await connection.query(
                                    "INSERT INTO ticket_combos (ticket_id, combo_id, quantity) VALUES ?",
                                    [comboValues]
                                );
                            }
                        }
                    }

                    // Lưu Payment History
                    if (firstTicketId) {
                        await connection.query(
                            `INSERT INTO payments (user_id, ticket_id, amount, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
                            [booking.user_id, firstTicketId, booking.total_price, 'SePay/QR', 'Success']
                        );
                    }
                }

                await connection.commit();
                console.log(`Đơn #${bookingId}: Thanh toán thành công.`);

                // 4. GỬI EMAIL VÉ
                // Format chuỗi Combo
                let comboString = "Không có";
                if (booking.combos_data) {
                    try {
                        const cList = JSON.parse(booking.combos_data);
                        if (cList.length > 0) comboString = cList.map(c => `${c.name} (x${c.quantity})`).join(", ");
                    } catch (e) {}
                }
                // Gọi hàm gửi mail
                sendTicketEmail(booking.user_email, {
                    bookingId: booking.id,
                    userName: booking.user_name,
                    movieName: booking.movie_title,
                    movieImage: booking.movie_poster,
                    theaterName: booking.theater_name,
                    showTime: booking.show_time,
                    showDate: new Date(booking.show_date).toLocaleDateString('vi-VN'),
                    seats: seatNumbers.join(", "),
                    combos: comboString,
                    totalPrice: booking.total_price
                });

            } catch (err) {
                await connection.rollback();
                console.error("Lỗi Webhook Transaction:", err);
            } finally {
                connection.release();
            }
        }
        return res.json({ success: true }); 
    } catch (error) {
        console.error("Lỗi Webhook Server:", error);
        res.status(500).json({ success: false });
    }
});

// --- API Lấy danh sách Khuyến Mãi ---
app.get("/api/promotions", async (req, res) => {
    try {
        const [promos] = await pool.query("SELECT * FROM promotions ORDER BY id DESC");
        res.json(promos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// --- API lấy chi tiết khuyến mãi
app.get("/api/promotions/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM promotions WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// --- API Lấy danh sách Blog/Tin tức ---
app.get("/api/blogs", async (req, res) => {
    try {
        const [blogs] = await pool.query("SELECT * FROM blogs ORDER BY created_at DESC");
        res.json(blogs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi lấy tin tức" });
    }
});

// API: Lấy chi tiết 1 bài Blog theo ID (Giữ nguyên)
app.get("/api/blogs/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const [blog] = await pool.query("SELECT * FROM blogs WHERE id = ?", [id]);

        if (blog.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        res.json(blog[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});




//======================================================== WEB SOCKET ==================================================
io.on("connection", (socket) => {
  console.log("🟢 Có người kết nối:", socket.id);

  // 1. User tham gia (Giữ nguyên)
  socket.on("join_room", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} đã vào phòng user_${userId}`);
  });

  // 2. Admin tham gia (Giữ nguyên)
  socket.on("admin_join_room", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Admin đã vào phòng user_${userId}`);
  });

  // 3. Xử lý gửi tin nhắn (CẬP NHẬT LOGIC MỚI)
  socket.on("send_message", async (data) => {
    const { userId, sender, message, adminId } = data;

    try {
      if (sender === 'admin') {
          // 1. LẤY THÔNG TIN ADMIN VÀ ROLE TỪ DB
          const [adminRows] = await pool.query(`
              SELECT a.name, r.name as role 
              FROM admins a
              JOIN admin_roles ar ON a.id = ar.admin_id
              JOIN roles r ON ar.role_id = r.id
              WHERE a.id = ?
          `, [adminId]);

          const adminInfo = adminRows[0] || { name: 'Support', role: 'staff' };

          // 2. Lưu tin nhắn vào DB
          try {
              await pool.query(
                  "INSERT INTO chat_history (user_id, admin_id, sender, message) VALUES (?, ?, 'admin', ?)",
                  [userId, adminId, message]
              );
          } catch (fkErr) {
              await pool.query(
                  "INSERT INTO chat_history (user_id, admin_id, sender, message) VALUES (?, NULL, 'admin', ?)",
                  [userId, message]
              );
          }

          // 3. Gửi tin nhắn Realtime kèm Role chuẩn
          io.to(`user_${userId}`).emit("receive_message", {
              ...data,
              admin_role: adminInfo.role, // Gửi role ('admin' hoặc 'staff') xuống Frontend
              admin_name: adminInfo.name
          });

      } else {
          // User gửi (Giữ nguyên)
          await pool.query(
              "INSERT INTO chat_history (user_id, sender, message) VALUES (?, ?, ?)",
              [userId, sender, message]
          );
          io.to(`user_${userId}`).emit("receive_message", data);
          io.emit("admin_notification", { userId, message });
      }
    } catch (err) {
      console.error("Lỗi chat:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Ngắt kết nối:", socket.id);
  });
});

// API Lấy lịch sử chat
app.get("/api/chat/:userId", async (req, res) => {
    try {
        const sql = `
            SELECT 
                ch.*,
                a.name as admin_name,
                r.name as admin_role  -- Lấy tên role (ví dụ: 'admin', 'staff') để Frontend hiển thị màu Badge
            FROM chat_history ch
            LEFT JOIN admins a ON ch.admin_id = a.id
            LEFT JOIN admin_roles ar ON a.id = ar.admin_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE ch.user_id = ? 
            ORDER BY ch.created_at ASC
        `;
        const [rows] = await pool.query(sql, [req.params.userId]);
        res.json(rows);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: "Lỗi server" }); 
    }
});
// API: Đánh dấu tất cả tin nhắn của User này là Đã Đọc
app.put("/api/chat/read/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        // Chỉ update những tin nhắn do admin/staff gửi (sender != 'user') và chưa đọc
        await pool.query(
            "UPDATE chat_history SET is_read = 1 WHERE user_id = ? AND sender != 'user' AND is_read = 0",
            [userId]
        );
        res.json({ message: "Đã đánh dấu đã đọc" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});
// API Admin lấy danh sách chat users
app.get("/api/admin/chat/users", authenticateJWT("admin", "staff"), async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id, u.name, u.email, u.avatar,
                
                -- 1. Lấy nội dung tin nhắn cuối cùng (Bất kể ai gửi)
                (SELECT message FROM chat_history WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message,
                
                -- 2. Lấy NGƯỜI GỬI của tin nhắn cuối cùng (QUAN TRỌNG)
                (SELECT sender FROM chat_history WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_sender,
                
                -- 3. Lấy thời gian để sắp xếp
                (SELECT created_at FROM chat_history WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_time,
                
                -- 4. Đếm số tin chưa đọc từ khách
                (SELECT COUNT(*) FROM chat_history WHERE user_id = u.id AND sender = 'user' AND is_read = 0) as unread_count
                
            FROM users u
            JOIN chat_history ch ON u.id = ch.user_id
            GROUP BY u.id
            ORDER BY last_time DESC
        `;
        const [users] = await pool.query(sql);
        res.json(users);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: "Lỗi server" }); 
    }
});
// API ADMIN: Đánh dấu tin nhắn của USER NÀY là Đã Đọc (Admin đọc tin user gửi)
app.put("/api/admin/chat/read/:userId", authenticateJWT("admin", "staff"), async (req, res) => {
    try {
        const { userId } = req.params;
        // Update tin nhắn do user gửi (sender = 'user') và chưa đọc
        await pool.query(
            "UPDATE chat_history SET is_read = 1 WHERE user_id = ? AND sender = 'user' AND is_read = 0",
            [userId]
        );
        res.json({ message: "Đã đánh dấu đã đọc" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});



// =============================================================
// API: AI GỢI Ý PHIM (RAG - Retrieval Augmented Generation)
// =============================================================
app.post("/api/ai/recommend", async (req, res) => {
    try {
        const { query, userContext } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.json({ message: "Hệ thống AI đang nâng cấp. Mời bạn xem danh sách phim hot bên dưới!", movies: [] });
        }

        // 1. LẤY DỮ LIỆU PHIM
        // Lấy phim đang chiếu + Thể loại + Điểm đánh giá
        const sql = `
            SELECT 
                m.id, m.title, m.description, m.release_date, m.rating,
                (
                    SELECT GROUP_CONCAT(g.name SEPARATOR ', ')
                    FROM movie_genres mg
                    JOIN genres g ON mg.genre_id = g.id
                    WHERE mg.movie_id = m.id
                ) as genre
            FROM movies m 
            WHERE m.release_date <= CURDATE() + INTERVAL 30 DAY 
            AND m.release_date >= CURDATE() - INTERVAL 90 DAY
        `;
        const [movies] = await pool.query(sql);

        if (movies.length === 0) {
            return res.json({ message: "Hiện tại rạp đang cập nhật phim mới. Bạn quay lại sau nhé!", movies: [] });
        }

        // 2. CHUẨN BỊ KỊCH BẢN CHO AI 
        const movieDataText = movies.map(m => 
            `[ID: ${m.id}] Phim: "${m.title}" | Thể loại: ${m.genre} | Rating: ${m.rating}/10 | Nội dung: ${m.description}`
        ).join("\n");

        const userProfile = userContext 
            ? `Khách hàng: ${userContext.age || 'không rõ'} tuổi. ${userContext.history ? 'Đã từng xem: ' + userContext.history.join(', ') : ''}`
            : "Khách hàng vãng lai.";

        const prompt = `
        Bạn là "CineBot" - trợ lý rạp chiếu phim thông thái, vui tính và am hiểu tâm lý khách hàng Việt Nam.

        KHO DỮ LIỆU PHIM HIỆN CÓ TẠI RẠP:
        ${movieDataText}

        THÔNG TIN KHÁCH HÀNG:
        ${userProfile}

        CÂU HỎI/MONG MUỐN CỦA KHÁCH: "${query}"

        NHIỆM VỤ CỦA BẠN:
        1. **Phân tích ý định:** Xác định xem khách có đang hỏi về phim ảnh, giải trí, hay đi chơi không.
        2. **Xử lý câu hỏi không liên quan (QUAN TRỌNG):** - Nếu khách hỏi những câu KHÔNG LIÊN QUAN đến phim, rạp chiếu, tình cảm, giải trí (Ví dụ: "Cách nấu phở", "Giải toán", "Code python", "Chính trị"...), hãy từ chối khéo léo một cách hài hước.
           - Trả về danh sách phim rỗng [] trong trường hợp này.
           - Ví dụ câu trả lời: "Mình chỉ là bot bán vé thôi, hỏi chuyện phim thì mình biết tuốt! 🎬" hoặc "Ca này khó, mình chỉ rành phim ảnh thôi à 😅".
        3. **Lựa chọn phim:** Nếu câu hỏi hợp lệ, chọn ra tối đa 3 phim phù hợp nhất.
        4. **Phản hồi:** Trả lời ngắn gọn (dưới 40 từ), giọng điệu tự nhiên, hài hước, thân thiện, có thể dùng emoji. Kèm theo đó là danh sách ID phim đã chọn.

        YÊU CẦU ĐẦU RA (JSON CHUẨN):
        Chỉ trả về JSON, không markdown. Format:
        {
            "reason": "Câu trả lời của bạn...",
            "movie_ids": [id1, id2, id3] (hoặc [] nếu không liên quan)
        }
        `;

        // 3. GỌI GEMINI (Generation)
        const aiResult = await model.generateContent(prompt);
        const response = await aiResult.response;
        let text = response.text();

        // Làm sạch JSON (Phòng trường hợp AI trả về format lạ)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let aiOutput;
        try {
            aiOutput = JSON.parse(text);
        } catch (e) {
            console.error("AI JSON Parse Error:", text);
            // Fallback nếu AI trả về lỗi JSON
            aiOutput = { reason: "Mình đang hơi lag xíu, nhưng bạn xem thử mấy phim này nha! 👇", movie_ids: movies.slice(0, 3).map(m => m.id) };
        }

        // 4. TRUY VẤN CHI TIẾT PHIM ĐỂ TRẢ VỀ FRONTEND
        let recommendedMovies = [];
        // Chỉ query DB nếu AI trả về có ID phim (tức là câu hỏi hợp lệ)
        if (aiOutput.movie_ids && aiOutput.movie_ids.length > 0) {
            const validIds = aiOutput.movie_ids.filter(id => !isNaN(id));
            
            if (validIds.length > 0) {
                const [dbMovies] = await pool.query(
                    `SELECT * FROM movies WHERE id IN (?) ORDER BY FIELD(id, ${validIds.join(',')})`,
                    [validIds]
                );
                recommendedMovies = dbMovies.map(m => ({
                    ...m, 
                    match_score: Math.floor(90 + Math.random() * 9) 
                }));
            }
        } else {
            // Nếu AI trả về danh sách rỗng (do câu hỏi không liên quan), 
            // Ta KHÔNG fallback về random movies nữa, mà tôn trọng quyết định từ chối của AI.
            // Tuy nhiên, để giao diện không bị trống trơn, ta có thể gợi ý nhẹ:
            if (aiOutput.reason.includes("không biết") || aiOutput.reason.includes("chỉ là bot")) {
            }
        }

        res.json({
            message: aiOutput.reason,
            movies: recommendedMovies
        });

    } catch (err) {
        console.error("Lỗi AI Agent:", err);
        res.status(500).json({ message: "AI đang nghỉ ngơi xíu. Bạn tham khảo danh sách phim bên dưới nha!" });
    }
});



//======================================================== START SERVER ==================================================
if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT} với Socket.IO`);
    });
}

export default app;