// routes/orderRoutes

const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

router.get("/", orderController.getOrders); // ✅ IMPORTANT

// today code
router.post("/payu/success", orderController.payuSuccess);
router.post("/payu/failure", orderController.payuFailure);



router.put("/:id/status", orderController.updateStatus);
router.put("/:id/shipping", orderController.updateShipping);

// Generate PDFs and persist invoice_url / shipping_label_url in DB
router.post("/:id/invoice", orderController.generateInvoice);
router.post("/:id/label", orderController.generateLabel);

router.get("/:id/invoice", orderController.downloadInvoice);
router.get("/:id/label", orderController.downloadLabel);

router.put("/:id/return", orderController.updateReturnReplacement);
router.put("/:id/replacement", orderController.updateReturnReplacement);
router.put("/:id/refund", orderController.updateRefundStatus);




module.exports = router;