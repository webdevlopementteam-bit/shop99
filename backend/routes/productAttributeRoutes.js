// routes/productAttributeRoutes.js

const router = require("express").Router();
const controller = require("../controllers/productAttributeController");

// 🔥 PUT THIS FIRST
router.post("/bulk", controller.bulkAssign);

router.get("/:productId", controller.getByProduct);
router.put("/:id", controller.update);

module.exports = router;