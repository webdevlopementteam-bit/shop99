const express = require("express");
const router = express.Router();

const {
  addDeals,
  getDeals,
  updateDeal,
  deleteDeal,
} = require("../controllers/dealController");

router.get("/", getDeals);
router.post("/", addDeals);
router.put("/:id", updateDeal);
router.delete("/:id", deleteDeal);

module.exports = router;
