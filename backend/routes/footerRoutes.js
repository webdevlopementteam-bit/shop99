const express = require("express");
const router = express.Router();
const controller = require("../controllers/footerController");
const upload = require("../middleware/upload");

router.get("/", controller.getFooter);
router.post("/", upload.single("logo"), controller.createFooter);
router.put("/:id", upload.single("logo"), controller.updateFooter);
router.delete("/:id", controller.deleteFooter);

module.exports = router;