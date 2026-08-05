// // backend/routes/categoryRoutes.js

// const router = require("express").Router();
// const upload = require("../middleware/upload");
// const controller = require("../controllers/categoryController");

// router.get("/", controller.getAll);

// router.get("/parents", controller.getParents);
// router.get("/top", controller.getTopCategories);
// router.get("/:id", controller.getOne);

// router.post("/", upload.single("image"), controller.create);
// router.put("/:id", upload.single("image"), controller.update);

// router.delete("/:id", controller.remove);




// module.exports = router;


const router = require("express").Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/categoryController");

// ⚠️ IMPORTANT: specific routes first
router.get("/parents", controller.getParents);
router.get("/top", controller.getTopCategories);

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);

const categoryUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "banner", maxCount: 1 }
]);

router.post("/", categoryUpload, controller.create);
router.put("/:id", categoryUpload, controller.update);

router.delete("/:id", controller.deleteCategory);

module.exports = router;