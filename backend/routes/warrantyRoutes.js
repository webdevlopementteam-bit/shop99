const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const upload = require("../middleware/upload");
const controller = require("../controllers/warrantyController");

// Logged-in users get user_id attached (and can pick from their own orders);
// logged-out users can still register a warranty for a product bought elsewhere.
router.post("/", optionalAuthMiddleware, upload.single("invoice"), controller.createWarranty);
router.get("/my", authMiddleware, controller.getMyWarranties);

// admin panel
router.get("/", controller.getAllWarranties);
router.put("/:id/status", controller.updateWarrantyStatus);

module.exports = router;
