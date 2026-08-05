const router = require("express").Router();
const controller = require("../controllers/shippingController");

router.get("/states", controller.getStates);
router.get("/product/:productId", controller.getProductShipping);
router.put("/product/:productId", controller.putProductShipping);

module.exports = router;
