// seedAdmins.js
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

async function seed() {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "kmovie",
  });

  try {
    // Tạo roles (nếu chưa có)
    const roles = [
      { name: "admin", description: "Quản trị viên" },
      { name: "staff", description: "Nhân viên rạp" },
    ];

    for (const role of roles) {
      await pool.query(
        `INSERT INTO roles (name, description) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE name=name`,
        [role.name, role.description]
      );
    }

    console.log("Roles đã được tạo hoặc tồn tại");

    // Hash password
    const adminPassword = await bcrypt.hash("admin123", 10);
    const staffPassword = await bcrypt.hash("staff123", 10);

    // Tạo admin và staff
    const admins = [
      { name: "Admin Demo", email: "admin@kmovie.com", password: adminPassword },
      { name: "Staff Demo", email: "staff@kmovie.com", password: staffPassword },
    ];

    for (const a of admins) {
      await pool.query(
        `INSERT INTO admins (name, email, password) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE email=email`,
        [a.name, a.email, a.password]
      );
    }

    console.log("Admin và Staff đã được tạo hoặc tồn tại");

    // Lấy role_id và admin_id
    const [rolesRows] = await pool.query(`SELECT id, name FROM roles`);
    const roleMap = {};
    rolesRows.forEach(r => (roleMap[r.name] = r.id));

    const [adminsRows] = await pool.query(`SELECT id, email FROM admins`);
    const adminMap = {};
    adminsRows.forEach(a => (adminMap[a.email] = a.id));

    // Gán role cho admin và staff
    const adminRoles = [
      { adminEmail: "admin@kmovie.com", roleName: "admin" },
      { adminEmail: "staff@kmovie.com", roleName: "staff" },
    ];

    for (const ar of adminRoles) {
      const admin_id = adminMap[ar.adminEmail];
      const role_id = roleMap[ar.roleName];

      await pool.query(
        `INSERT INTO admin_roles (admin_id, role_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE admin_id=admin_id`,
        [admin_id, role_id]
      );
    }

    console.log("Roles đã được gán cho admin và staff");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
