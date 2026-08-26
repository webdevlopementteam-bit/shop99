const Blogs = require("../models/blogsModel");
const { slugify, generateUniqueSlug, buildMetaDescription } = require("../utils/slugify");

async function slugTakenByOtherBlog(candidate, excludeId) {
  const blog = await Blogs.findOne({ where: { slug: candidate } });
  if (!blog) return false;
  return excludeId == null || String(blog.id) !== String(excludeId);
}

/**
 * Resolves the slug to save for a blog.
 * - `requestedSlug` is `undefined` when the caller never sent a `slug` field —
 *   the existing slug (or a freshly generated one) is kept as-is.
 * - An explicitly blank `requestedSlug` ("") re-generates from the title.
 * - A non-empty `requestedSlug` is treated as a deliberate custom slug: it's
 *   sanitized and must be unique among other blogs.
 */
async function resolveBlogSlug({ title, requestedSlug, currentSlug, excludeId }) {
  if (requestedSlug === undefined) {
    if (currentSlug) return { slug: currentSlug };
    const slug = await generateUniqueSlug(title, (c) => slugTakenByOtherBlog(c, excludeId));
    return { slug };
  }

  const trimmed = String(requestedSlug || "").trim();
  if (!trimmed) {
    const slug = await generateUniqueSlug(title, (c) => slugTakenByOtherBlog(c, excludeId));
    return { slug };
  }

  const sanitized = slugify(trimmed);
  if (!sanitized) {
    return { error: "Custom slug must contain at least one letter or number." };
  }
  if (sanitized === currentSlug) return { slug: sanitized };
  if (await slugTakenByOtherBlog(sanitized, excludeId)) {
    return { error: `Slug "${sanitized}" is already in use. Please choose a different slug.` };
  }
  return { slug: sanitized };
}

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

/* ================= GET BY ID OR SLUG ================= */
exports.getBlogById = async (req, res) => {
  try {
    const identifier = req.params.id;
    // Admin panel passes the numeric id; storefront links by slug
    // (SEO-friendly URLs) — this endpoint transparently supports both.
    const lookupWhere = /^\d+$/.test(String(identifier))
      ? { id: identifier }
      : { slug: identifier };

    const blog = await Blogs.findOne({ where: lookupWhere });

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
    const { title, content, slug, meta_title, meta_description, meta_keywords } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const slugResult = await resolveBlogSlug({ title, requestedSlug: slug });
    if (slugResult.error) {
      return res.status(400).json({ message: slugResult.error });
    }

    const trimmedContent = content != null ? String(content).trim() : "";
    const trimmedMetaTitle = meta_title != null ? String(meta_title).trim() : "";
    const trimmedMetaDescription =
      meta_description != null ? String(meta_description).trim() : "";

    const blog = await Blogs.create({
      image: req.file ? req.file.filename : null,
      title,
      slug: slugResult.slug,
      content: trimmedContent || null,
      meta_title: trimmedMetaTitle || title,
      meta_description:
        trimmedMetaDescription || buildMetaDescription(trimmedContent || title),
      meta_keywords: meta_keywords != null ? String(meta_keywords).trim() || null : null,
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

    const { title, content, slug, meta_title, meta_description, meta_keywords } = req.body;

    const nextTitle = title !== undefined ? title : blog.title;

    const slugResult = await resolveBlogSlug({
      title: nextTitle,
      requestedSlug: slug,
      currentSlug: blog.slug,
      excludeId: blog.id,
    });
    if (slugResult.error) {
      return res.status(400).json({ message: slugResult.error });
    }

    const updatedData = {
      title: nextTitle,
      slug: slugResult.slug,
      content: content !== undefined ? String(content).trim() || null : blog.content,
      meta_title:
        meta_title !== undefined ? String(meta_title).trim() || nextTitle : blog.meta_title,
      meta_description:
        meta_description !== undefined
          ? String(meta_description).trim() ||
            buildMetaDescription((content !== undefined ? content : blog.content) || nextTitle)
          : blog.meta_description,
      meta_keywords:
        meta_keywords !== undefined
          ? String(meta_keywords).trim() || null
          : blog.meta_keywords,
      image: req.file ? req.file.filename : blog.image,
    };

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
