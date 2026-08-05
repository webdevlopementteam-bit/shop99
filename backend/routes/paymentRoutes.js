const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

router.post("/create-payment", optionalAuthMiddleware, paymentController.createPayment);
router.post("/verify-payment", paymentController.verifyPayment);

module.exports = router;