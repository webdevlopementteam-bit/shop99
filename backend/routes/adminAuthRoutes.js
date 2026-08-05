const router = require("express").Router();
const controller = require("../controllers/adminAuthController");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

router.post("/register", controller.registerAdmin);
router.post("/login", controller.loginAdmin);
router.get("/profile", adminAuthMiddleware, controller.getAdminProfile);
router.put("/profile", adminAuthMiddleware, controller.updateAdminProfile);
router.patch("/password", adminAuthMiddleware, controller.changePassword);

module.exports = router;
