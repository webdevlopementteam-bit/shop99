const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile
} = require("../controllers/profileController");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, upload.single("image"), updateProfile);

module.exports = router;

