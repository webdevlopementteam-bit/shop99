const Blogs = require("../models/blogsModel");

const parseJsonField = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

/* ================= GET ALL ================= */
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blogs.findAll({
      order: [["id", "DESC"]],
    });

    res.json(blogs);
  } catch (error) {
    console.error("GET BLOGS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET BY ID ================= */
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blogs.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(blog);
  } catch (error) {
    console.error("GET BLOG BY ID ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= CREATE ================= */
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      question,
      answer,
      features,
      benefits,
      why_choose_us,
      whyChooseUs,
      conclusion,
      faq,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const blog = await Blogs.create({
      image: req.file ? req.file.filename : null,
      title,
      question: question || null,
      answer: answer || null,
      features: parseJsonField(features, []),
      benefits: parseJsonField(benefits, []),
      why_choose_us: why_choose_us || whyChooseUs || null,
      conclusion: conclusion || null,
      faq: parseJsonField(faq, []),
    });

    res.status(201).json({
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("CREATE BLOG ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= UPDATE ================= */
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blogs.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const {
      title,
      question,
      answer,
      features,
      benefits,
      why_choose_us,
      whyChooseUs,
      conclusion,
      faq,
    } = req.body;

    const updatedData = {
      title: title !== undefined ? title : blog.title,
      question: question !== undefined ? question : blog.question,
      answer: answer !== undefined ? answer : blog.answer,
      why_choose_us:
        why_choose_us !== undefined
          ? why_choose_us
          : whyChooseUs !== undefined
          ? whyChooseUs
          : blog.why_choose_us,
      conclusion: conclusion !== undefined ? conclusion : blog.conclusion,
      image: req.file ? req.file.filename : blog.image,
    };

    if (features !== undefined) {
      updatedData.features = parseJsonField(features, blog.features);
    }

    if (benefits !== undefined) {
      updatedData.benefits = parseJsonField(benefits, blog.benefits);
    }

    if (faq !== undefined) {
      updatedData.faq = parseJsonField(faq, blog.faq);
    }

    await blog.update(updatedData);

    res.json({
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("UPDATE BLOG ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= DELETE ================= */
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blogs.findByPk(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    await blog.destroy();

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("DELETE BLOG ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
