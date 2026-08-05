const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/userAddressController");

router.get("/", authMiddleware, controller.getMyAddresses);
router.post("/", authMiddleware, controller.createAddress);
router.put("/:id", authMiddleware, controller.updateAddress);
router.delete("/:id", authMiddleware, controller.deleteAddress);
router.patch("/:id/default", authMiddleware, controller.setDefaultAddress);

module.exports = router;
