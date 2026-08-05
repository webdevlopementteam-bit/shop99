const express = require("express");
const router = express.Router();
const seoController = require("../controllers/seoController");
const upload = require("../middleware/upload");

router.post("/", upload.single("og_image"), seoController.createSEO);

router.get("/", seoController.getSEO);

router.get("/:page", seoController.getSEOByPage);

router.put("/:id", upload.single("og_image"), seoController.updateSEO);

router.delete("/:id", seoController.deleteSEO);

router.patch("/:id/status", seoController.toggleStatus);





module.exports = router;