const router = require("express").Router();
const controller = require("../controllers/newsletterSubscriptionController");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

router.get("/", controller.getAll);
router.post("/", optionalAuthMiddleware, controller.subscribe);

module.exports = router;
