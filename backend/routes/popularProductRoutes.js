const express = require("express");
const router = express.Router();

const {
  addPopularProducts,
  getPopularProducts,
  deletePopularProduct,
} = require("../controllers/popularProductController");

router.get("/", getPopularProducts);
router.post("/", addPopularProducts);
router.delete("/:id", deletePopularProduct);

module.exports = router;