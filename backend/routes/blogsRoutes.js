const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const blogsController = require("../controllers/blogsController");

router.get("/", blogsController.getBlogs);
router.get("/:id", blogsController.getBlogById);
router.post("/", upload.single("image"), blogsController.createBlog);
router.put("/:id", upload.single("image"), blogsController.updateBlog);
router.delete("/:id", blogsController.deleteBlog);

module.exports = router;
