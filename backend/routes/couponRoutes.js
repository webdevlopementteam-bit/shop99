const router = require("express").Router();
const controller = require("../controllers/couponController");

router.get("/", controller.getCoupons);

router.post("/", controller.createCoupon);

router.put("/:id", controller.updateCoupon);

router.delete("/:id", controller.deleteCoupon);

router.post("/apply", controller.applyCoupon);

module.exports = router;