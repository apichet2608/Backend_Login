const express = require("express");
const router = express.Router();
const cors = require("cors");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const secretKey = "fujikura_smart_factory";

const pool = new Pool({
  host: "10.17.66.120",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "fetlmes",
});

router.use(cors());

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

router.post("/register", jsonParser, async function (req, res, next) {
  try {
    let { username, password, email, op_id } = req.body;

    // Convert username and email to uppercase and lowercase respectively before saving
    username = username.toUpperCase();
    email = email.toUpperCase();
    username = username.toLowerCase();
    email = email.toLowerCase();
    // Check if the username or email already exists in the database
    const duplicateQuery =
      "SELECT COUNT(*) FROM info_userid.foxconn_upload_userid WHERE username = $1 OR email = $2";
    const duplicateResult = await pool.query(duplicateQuery, [username, email]);

    if (duplicateResult.rows[0].count > 0) {
      return res.status(201).json({
        message: "This username or email is already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query =
      "INSERT INTO info_userid.foxconn_upload_userid (username, password, email,op_id) VALUES ($1, $2, $3, $4)";
    await pool.query(query, [username, hashedPassword, email, op_id]);
    res.status(201).json({ message: "User registration successful" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({
      message: "Registration failed",
      error: {
        message: error.message,
        sql: error.query,
      },
    });
  }
});

router.post("/login", jsonParser, async function (req, res, next) {
  try {
    let { usernameOrEmail, password } = req.body;
    usernameOrEmail = usernameOrEmail.toUpperCase();
    usernameOrEmail = usernameOrEmail.toLowerCase();

    const query =
      "SELECT * FROM info_userid.foxconn_upload_userid WHERE username = $1 OR email = $1";
    const result = await pool.query(query, [usernameOrEmail]);

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "1h" });

    res.json({
      status: "OK",
      message: "Login successful",
      token: token,
      user: {
        // Add user details to the JSON object sent back
        id: user.id,
        username: user.username,
        email: user.email,
        // Add additional user details as needed
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed" });
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
        SELECT * FROM info_userid.foxconn_upload_userid
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
