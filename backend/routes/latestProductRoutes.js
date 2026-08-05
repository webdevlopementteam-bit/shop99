const express = require("express");
const router = express.Router();

const {
  addLatestProducts,
  getLatestProducts,
  deleteLatestProduct,
} = require("../controllers/latestProductController");

router.get("/", getLatestProducts);
router.post("/", addLatestProducts);
router.delete("/:id", deleteLatestProduct);

module.exports = router;
