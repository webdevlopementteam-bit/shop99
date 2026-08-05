const router = require("express").Router();
const controller = require("../controllers/categoryAttributeController");

// router.get("/:categoryId", controller.getByCategory);
// router.post("/assign", controller.assign);
router.get("/:categoryId", controller.getByCategory);
router.get("/full/:categoryId", controller.getFullAttributes);
router.post("/assign", controller.assign);

module.exports = router;