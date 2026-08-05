
const Category = require("../models/categoryModel");
const { Op } = require("sequelize");
const Product = require("../models/productModel");

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const normalizeHsn = (value) =>
  value != null && String(value).trim() !== ""
    ? String(value).trim()
    : null;

const syncCategoryHsnToProducts = (categoryId, hsn) =>
  Product.update({ hsn }, { where: { category_id: categoryId } });

const getUploadedFileName = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0].filename;
  }

  if (req.file && req.file.fieldname === fieldName) {
    return req.file.filename;
  }

  return null;
};

const hasTruthyFlag = (...values) =>
  values.some((value) => value === true || value === 1 || value === "1" || value === "true");

/* ================= GET ALL ================= */
exports.getAll = async (req, res) => {
  try {
    let { page, limit } = req.query;

    /* ================= FRONTEND (NO PAGINATION) ================= */
    if (!page || !limit) {
      const data = await Category.findAll({
        where: {
          is_publish: 1 // frontend me sirf published
        },
        order: [["id", "DESC"]],
        include: [
          {
            model: Category,
            as: "parent",
            attributes: ["id", "name"]
          }
        ]
      });

      return res.json({
        categories: data,
        totalPages: 1,
        currentPage: 1
      });
    }

    /* ================= ADMIN (WITH PAGINATION) ================= */

    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    const { count, rows } = await Category.findAndCountAll({
      // ⚠️ admin me filter hata diya (sab dikhane ke liye)
      // where: { is_parent: false },

      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name"]
        }
      ]
    });

    res.json({
      categories: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET PARENTS (DYNAMIC) ================= */
exports.getParents = async (req, res) => {
  try {
    const { excludeId } = req.query;

    const whereCondition = {};

    if (excludeId) {
      whereCondition.id = { [Op.ne]: excludeId };
    }

    const data = await Category.findAll({
      where: whereCondition,
      attributes: ["id", "name"],
      order: [["name", "ASC"]]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

/* ================= GET TOP ================= */
exports.getTopCategories = async (req, res) => {
  try {
    const data = await Category.findAll({
      where: { is_top_category: true },
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

/* ================= GET ONE ================= */
exports.getOne = async (req, res) => {
  try {
    const data = await Category.findByPk(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

/* ================= CREATE ================= */
exports.create = async (req, res) => {
  try {
    const slug = slugify(req.body.name);

    // Accept both `tax_rate` and `gst_percentage` from admin UI.
    const rawTax =
      req.body.tax_rate != null && req.body.tax_rate !== ""
        ? req.body.tax_rate
        : req.body.gst_percentage;
    const tax_rate = rawTax == null || rawTax === "" ? 0 : Number(rawTax);
    if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid GST percentage (0-100)"
      });
    }

    const hsn = normalizeHsn(req.body.hsn);
    const image = getUploadedFileName(req, "image");
    const banner = getUploadedFileName(req, "banner");

    const newCategory = await Category.create({
      name: req.body.name,
      slug,
      parent_id: req.body.parent_id || null,
      tax_rate,
      hsn,
      is_publish: Number(req.body.is_publish) || 0,
      is_top_category: Number(req.body.is_top_category) || 0,
      image,
      banner
    });

    // 🔥 AUTO MAKE PARENT
    if (req.body.parent_id) {
      await Category.update(
        { is_parent: true },
        { where: { id: req.body.parent_id } }
      );
    }

    await syncCategoryHsnToProducts(newCategory.id, hsn);

    res.json({ success: true, data: newCategory });
  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
};

/* ================= UPDATE ================= */
exports.update = async (req, res) => {
  try {
    const slug = slugify(req.body.name);

    const category = await Category.findByPk(req.params.id);

    const oldParentId = category.parent_id;
    const newParentId = req.body.parent_id || null;

    const rawTax =
      req.body.tax_rate != null && req.body.tax_rate !== ""
        ? req.body.tax_rate
        : req.body.gst_percentage;
    const tax_rate =
      rawTax == null || rawTax === "" ? category.tax_rate ?? 0 : Number(rawTax);
    if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid GST percentage (0-100)"
      });
    }

    const hsn =
      req.body.hsn === undefined
        ? category.hsn
        : normalizeHsn(req.body.hsn);
    const image = getUploadedFileName(req, "image");
    const banner = getUploadedFileName(req, "banner");
    const shouldRemoveImage = hasTruthyFlag(
      req.body.remove_image,
      req.body.removeImage
    );
    const shouldRemoveBanner = hasTruthyFlag(
      req.body.remove_banner,
      req.body.removeBanner
    );
    const nextImage = image || (shouldRemoveImage ? null : category.image);
    const nextBanner = banner || (shouldRemoveBanner ? null : category.banner);

    await Category.update(
      {
        name: req.body.name,
        slug,
        parent_id: newParentId,
        tax_rate,
        hsn,
        is_publish:
          req.body.is_publish === "true" || req.body.is_publish == 1,
        is_top_category: Number(req.body.is_top_category) || 0,
        image: nextImage,
        banner: nextBanner
      },
      {
        where: { id: req.params.id }
      }
    );

    await syncCategoryHsnToProducts(req.params.id, hsn);

    // 🔥 NEW parent ko parent bana do
    if (newParentId) {
      await Category.update(
        { is_parent: true },
        { where: { id: newParentId } }
      );
    }

    // 🔥 OLD parent ko check karo (agar koi child nahi bacha)
    if (oldParentId && oldParentId !== newParentId) {
      const count = await Category.count({
        where: { parent_id: oldParentId }
      });

      if (count === 0) {
        await Category.update(
          { is_parent: false },
          { where: { id: oldParentId } }
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
};


/* ================= DELETE ================= */
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    // 🔥 CHECK CATEGORY EXISTS
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json("Category not found");
    }

    // 🔥 CHECK PRODUCTS
    const product = await Product.findOne({
      where: { category_id: id }
    });

    if (product) {
      return res.status(400).json(
        "Cannot delete: Category has products"
      );
    }

    // 🔥 CHECK CHILD CATEGORY
    const child = await Category.findOne({
      where: { parent_id: id }
    });

    if (child) {
      return res.status(400).json(
        "Cannot delete: Category has subcategories"
      );
    }

    const parentId = category.parent_id;

    // 🔥 DELETE
    await Category.destroy({
      where: { id }
    });

    // 🔥 CLEANUP PARENT
    if (parentId) {
      const count = await Category.count({
        where: { parent_id: parentId }
      });

      if (count === 0) {
        await Category.update(
          { is_parent: false },
          { where: { id: parentId } }
        );
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json(err.message);
  }
};