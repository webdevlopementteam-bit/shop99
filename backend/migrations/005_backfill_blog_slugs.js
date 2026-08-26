// backend/migrations/005_backfill_blog_slugs.js
//
// One-time backfill for blogs created before slug/content/meta_* existed.
// Run once: node migrations/005_backfill_blog_slugs.js
//
// - slug: generated from the blog title, made unique (title collisions get
//   `-1`, `-2`, ... suffixes, same rule as products).
// - meta_title: blog title (only fields that are still empty are touched).
// - meta_description: best available old text (answer/question/why_choose_us/
//   conclusion), falling back to the title.
// - content: old posts had no rich-text body — this stitches the legacy
//   structured fields (question/answer/features/benefits/why_choose_us/
//   conclusion/faq) into one HTML blob so the new admin editor has something
//   to show/edit instead of a blank field. No-op when content already exists.

const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Blogs = require("../models/blogsModel");
const { generateUniqueSlug, buildMetaDescription } = require("../utils/slugify");

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function buildLegacyContentHtml(blog) {
  const parts = [];

  if (blog.question) {
    parts.push(`<h2>${escapeHtml(blog.question)}</h2>`);
  }
  if (blog.answer) {
    parts.push(`<p>${escapeHtml(blog.answer)}</p>`);
  }

  const features = toArray(blog.features).filter(Boolean);
  if (features.length) {
    parts.push("<h3>Features</h3>");
    parts.push(`<ul>${features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`);
  }

  const benefits = toArray(blog.benefits).filter(Boolean);
  if (benefits.length) {
    parts.push("<h3>Benefits</h3>");
    parts.push(`<ul>${benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`);
  }

  if (blog.why_choose_us) {
    parts.push("<h3>Why Choose Us</h3>");
    parts.push(`<p>${escapeHtml(blog.why_choose_us)}</p>`);
  }

  if (blog.conclusion) {
    parts.push("<h3>Conclusion</h3>");
    parts.push(`<p>${escapeHtml(blog.conclusion)}</p>`);
  }

  const faq = toArray(blog.faq).filter((row) => row && (row.question || row.q));
  if (faq.length) {
    parts.push("<h3>FAQ</h3>");
    for (const row of faq) {
      const q = row.question ?? row.q ?? "";
      const a = row.answer ?? row.a ?? "";
      if (q) parts.push(`<p><strong>${escapeHtml(q)}</strong></p>`);
      if (a) parts.push(`<p>${escapeHtml(a)}</p>`);
    }
  }

  return parts.join("\n");
}

async function run() {
  await sequelize.authenticate();

  const blogs = await Blogs.findAll({ order: [["id", "ASC"]] });

  const takenSlugs = new Set(
    (
      await sequelize.query("SELECT slug FROM blogs WHERE slug IS NOT NULL", {
        type: QueryTypes.SELECT,
      })
    ).map((r) => r.slug)
  );

  let updated = 0;

  for (const blog of blogs) {
    const patch = {};

    if (!blog.slug || !blog.slug.trim()) {
      const slug = await generateUniqueSlug(blog.title, async (candidate) =>
        takenSlugs.has(candidate)
      );
      takenSlugs.add(slug);
      patch.slug = slug;
    } else {
      takenSlugs.add(blog.slug);
    }

    if (!blog.content || !blog.content.trim()) {
      const html = buildLegacyContentHtml(blog);
      if (html) patch.content = html;
    }

    if (!blog.meta_title || !blog.meta_title.trim()) {
      patch.meta_title = blog.title;
    }

    if (!blog.meta_description || !blog.meta_description.trim()) {
      const source =
        (blog.answer && blog.answer.trim()) ||
        (blog.question && blog.question.trim()) ||
        (blog.why_choose_us && blog.why_choose_us.trim()) ||
        (blog.conclusion && blog.conclusion.trim()) ||
        blog.title;
      patch.meta_description = buildMetaDescription(source);
    }

    if (Object.keys(patch).length > 0) {
      await blog.update(patch);
      updated += 1;
    }
  }

  console.log(`Backfill complete. ${updated}/${blogs.length} blogs updated.`);
  await sequelize.close();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
