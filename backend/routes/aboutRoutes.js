const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const aboutController = require("../controllers/aboutController");
const aboutUpload = upload.fields([
  { name: "about_image", maxCount: 1 },
  { name: "banner_image", maxCount: 1 },
]);

router.get("/", aboutController.getAbout);
router.get("/all", aboutController.getAboutList);
router.get("/:id", aboutController.getAboutById);
router.post("/", aboutUpload, aboutController.createAbout);
router.put("/:id", aboutUpload, aboutController.updateAbout);
router.delete("/:id", aboutController.deleteAbout);

module.exports = router;
