const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

/** Same pattern as product routes: multipart + optional `images` files */
const reviewUpload = upload.fields([{ name: "images", maxCount: 10 }]);

const {
  getReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  adminListReviews,
  adminCreateReview,
  adminUpdateReview,
  adminDeleteReview
} = require("../controllers/productReviewController");

const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

/** Admin panel (existing). */
router.get("/admin", adminListReviews);
router.post("/admin", reviewUpload, adminCreateReview);
router.put("/admin/:id", reviewUpload, adminUpdateReview);
router.delete("/admin/:id", adminDeleteReview);

/** Public / app user: list reviews on a product */
router.get("/product/:productId", getReviewsByProduct);

/** Logged-in user: my reviews */
router.get("/me", authMiddleware, getMyReviews);


router.post("/", optionalAuthMiddleware, reviewUpload, createReview);

router.put("/:id", authMiddleware, reviewUpload, updateReview);
router.delete("/:id", authMiddleware, deleteReview);

module.exports = router;
