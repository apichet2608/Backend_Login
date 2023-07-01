const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

// ตั้งค่า CORS
router.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Route POST '/send-email'
router.post("/", async (req, res) => {
  const { senderHead, senderEmail, message } = req.query;

  // กำหนดค่าการส่งอีเมล
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: "Apichet.Jtd@outlook.com", // อีเมลขององค์กร (Outlook/Microsoft 365)
      pass: "apmadaoap12", // รหัสผ่านอีเมลขององค์กร (Outlook/Microsoft 365)
    },
  });

  try {
    // ส่งอีเมล
    await transporter.sendMail({
      from: "Apichet.Jtd@outlook.com", // อีเมลผู้ส่ง
      to: `${senderEmail}`, // อีเมลผู้รับ
      subject: `${senderHead}`, // หัวข้ออีเมล
      html: `<p>${message}</p>`, // เนื้อหาอีเมล (ใช้ HTML)
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

module.exports = router;
