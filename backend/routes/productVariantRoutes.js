const router = require("express").Router();
const controller = require("../controllers/productVariantController");
const upload = require("../middleware/upload");


// router.post("/bulk", controller.bulkSave);
router.post(
  "/bulk",
  upload.any(), // 🔥 IMPORTANT
  controller.bulkSave
);

/** Ek variant delete — DELETE /api/product-variants/:id?product_id= (optional) */
router.delete("/:id", controller.removeOne);

module.exports = router;