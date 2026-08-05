// // backend/routes/brandRoutes.js

// const router = require("express").Router();
// const db = require("../config/db");

// router.get("/", async (req, res) => {
//   const [rows] = await db.query("SELECT * FROM brands");
//   res.json(rows);
// });

// module.exports = router;


const router = require("express").Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/brandController");

router.get("/", controller.getAll);
router.post("/", upload.single("image"), controller.create);
router.put("/:id", upload.single("image"), controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
