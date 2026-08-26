const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

module.exports = multer({
  storage,
  // Multer/busboy default fieldSize is 1MB — too small for rich-text fields
  // (blog `content`, product descriptions, etc.), which routinely exceed
  // that once pasted from Word/Docs or holding an inline image.
  limits: { fieldSize: 25 * 1024 * 1024 },
});
