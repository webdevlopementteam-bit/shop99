const router = require("express").Router();
const controller = require("../controllers/authController");
const otpController = require("../controllers/otpController");
const User = require("../models/userModel");

router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/register", controller.registerUser);
router.post("/login", controller.loginUser);

router.post("/user/send-otp", otpController.sendOTP);
router.post("/user/verify-otp", otpController.verifyOTP);

module.exports = router;
