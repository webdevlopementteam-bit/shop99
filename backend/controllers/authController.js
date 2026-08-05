const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OTP = require("../models/otpModel");

/* ================= GENERATE TOKEN ================= */

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


/* ================= USER REGISTER ========================= */

exports.registerUser = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    const existing = await User.findOne({ where: { phone } });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      password: hashed,
      role: "user"
    });

    const token = generateToken(user.id, "user");

    res.json({
      message: "User Registered Successfully",
      token,
      role: "user"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= USER LOGIN ============================ */

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ where: { phone } });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid password" });

    const token = generateToken(user.id, "user");

    res.json({
      message: "Login Successful",
      token,
      role: "user"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= USER SEND OTP (unused — routes use otpController) ================= */

exports.sendUserOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone)
      return res.status(400).json({ message: "Phone required" });

    const user = await User.findOne({ where: { phone } });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const otp = generateOTP();

    await OTP.create({
      phone,
      otp,
      role: "user",
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    console.log("Generated OTP:", otp);

    res.json({
      message: "OTP sent successfully"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// verify otp (unused — routes use otpController)

exports.verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const record = await OTP.findOne({
      where: { phone, otp, role: "user" },
      order: [["createdAt", "DESC"]]
    });

    if (!record)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expires_at < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const user = await User.findOne({ where: { phone } });

    const token = generateToken(user.id, "user");

    await record.destroy();

    res.json({
      message: "OTP Verified Successfully",
      token,
      role: "user"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};