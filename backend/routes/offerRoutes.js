const router = require("express").Router();
const controller = require("../controllers/offerController");

router.get("/", controller.getOffers);
router.post("/", controller.createOffer);
router.put("/:id", controller.updateOffer);
router.delete("/:id", controller.deleteOffer);
router.patch("/:id/status", controller.toggleStatus);
router.post("/apply", controller.applyOffer);

module.exports = router;