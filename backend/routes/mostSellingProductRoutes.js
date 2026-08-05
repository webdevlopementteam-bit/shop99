const express = require("express");
const router = express.Router();

const {
  addMostSellingProducts,
  getMostSellingProducts,
  deleteMostSellingProduct,
} = require("../controllers/mostSellingProductController");

router.get("/", getMostSellingProducts);
router.post("/", addMostSellingProducts);
router.delete("/:id", deleteMostSellingProduct);

module.exports = router;
