const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const controller = require("../controllers/warrantyController");

router.post("/", authMiddleware, upload.single("invoice"), controller.createWarranty);
router.get("/my", authMiddleware, controller.getMyWarranties);

// admin panel
router.get("/", controller.getAllWarranties);
router.put("/:id/status", controller.updateWarrantyStatus);

module.exports = router;
