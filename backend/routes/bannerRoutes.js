const router = require("express").Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/bannerController");

const bannerUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "background", maxCount: 1 }
]);

router.get("/", controller.getAll);

router.post(
  "/",
  bannerUpload,
  controller.create
);

router.put(
  "/:id",
  bannerUpload,
  controller.update
);

router.delete(
  "/:id",
  controller.remove
);

module.exports = router;