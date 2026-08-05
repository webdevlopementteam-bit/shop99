const router = require("express").Router();
const controller = require("../controllers/dashboardController");

router.get("/", controller.getStats);

module.exports = router;
