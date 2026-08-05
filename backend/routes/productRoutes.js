// backend/routes/productRoutes.js

const router = require("express").Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/productController");

/* GET */
router.get("/", controller.getAll);

// router.get("/popular", controller.getPopularProducts);
router.get("/latest", controller.getLatestProducts);
router.get("/:id", controller.getOne);

/* POST */
// router.post("/", upload.single("image"), controller.create);
// router.put("/:id", upload.single("image"), controller.update);


router.post("/", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 }
  ]),
  controller.create
);

router.put("/:id",upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 }
  ]),
  controller.update
);

/* DELETE */
router.delete("/:id", controller.remove);

module.exports = router;