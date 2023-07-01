const express = require("express");
const router = express.Router();
const cors = require("cors");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const secretKey = "my_secret_key_fujikura";

const pool = new Pool({
  host: "10.17.77.111",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "postgres",
});

router.use(cors());

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// เส้นทางสำหรับลงทะเบียนผู้ใช้ใหม่
router.post("/register", jsonParser, async function (req, res, next) {
  try {
    const { username, password, email, fname, lname, dept, jgrade } = req.body;

    // ตรวจสอบว่า username หรือ email ซ้ำกับที่มีอยู่แล้วในฐานข้อมูล
    const duplicateQuery =
      "SELECT COUNT(*) FROM users WHERE username = $1 OR email = $2";
    const duplicateResult = await pool.query(duplicateQuery, [username, email]);

    if (duplicateResult.rows[0].count > 0) {
      return res.status(400).json({
        message: "ชื่อผู้ใช้หรืออีเมล์นี้ถูกใช้งานแล้ว",
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query =
      "INSERT INTO users (username, password, email, fname, lname, dept,jgrade) VALUES ($1, $2, $3, $4, $5, $6,$7)";
    await pool.query(query, [
      username,
      hashedPassword,
      email,
      fname,
      lname,
      dept,
      jgrade,
    ]);
    res.status(201).json({ message: "ลงทะเบียนผู้ใช้เรียบร้อยแล้ว" });
  } catch (error) {
    console.error("ข้อผิดพลาดในระหว่างการลงทะเบียน:", error);
    res.status(500).json({
      message: "การลงทะเบียนล้มเหลว",
      error: {
        message: error.message,
        sql: error.query,
      },
    });
  }
});

// เส้นทางสำหรับเข้าสู่ระบบ
router.post("/login", jsonParser, async function (req, res, next) {
  try {
    const { usernameOrEmail, password } = req.body;
    const query = "SELECT * FROM users WHERE username = $1 OR email = $1";
    const result = await pool.query(query, [usernameOrEmail]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "ข้อมูลประจำตัวไม่ถูกต้อง" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "ข้อมูลประจำตัวไม่ถูกต้อง" });
    }

    const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "1h" });

    res.json({
      status: "OK",
      message: "เข้าสู่ระบบสำเร็จ",
      token: token,
      user: {
        // เพิ่มข้อมูลผู้ใช้ในอ็อบเจกต์ JSON ที่ส่งกลับ
        id: user.id,
        username: user.username,
        email: user.email,
        // เพิ่มรายละเอียดเพิ่มเติมของผู้ใช้ตามต้องการ
      },
    });
  } catch (error) {
    console.error("ข้อผิดพลาดในระหว่างการเข้าสู่ระบบ:", error);
    res.status(500).json({ message: "เข้าสู่ระบบล้มเหลว" });
  }
});

router.post(
  "/protected-route/login",
  jsonParser,
  async function (req, res, next) {
    try {
      const token = req.headers["authorization"];
      var decoded = jwt.verify(token.split(" ")[1], secretKey);
      const userId = decoded.userId;

      // คำสั่ง SQL เพื่อดึงข้อมูลผู้ใช้จากฐานข้อมูล
      const query = `
        SELECT * FROM users
        WHERE id = $1
      `;
      const values = [userId];

      // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
      const result = await pool.query(query, values);
      const user = result.rows[0]; // ข้อมูลผู้ใช้ที่ได้จากการค้นหา

      res.json({
        status: "OK",
        message: "เข้าสู่ระบบปกป้องสำเร็จ",
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
          fname: user.fname,
          lname: user.lname,
          dept: user.dept,
          jgrade: user.jgrade,
          // เพิ่มรายละเอียดเพิ่มเติมของผู้ใช้ตามต้องการ
        },
      });
    } catch (error) {
      console.error("ข้อผิดพลาดในระหว่างการเข้าสู่ระบบปกป้อง:", error);
      res.status(500).json({ message: "เข้าสู่ระบบปกป้องล้มเหลว" });
    }
  }
);

module.exports = router;
