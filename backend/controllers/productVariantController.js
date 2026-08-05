const path = require("path");
const sequelize = require("../config/db");
const ProductVariant = require("../models/productVariantModel");
const ProductVariantImage = require("../models/productVariantImageModel");
const Product = require("../models/productModel");
const {
  normalizeVariantSpecificationsForStorage,
  coerceIncomingVariantFields,
  parseJsonIfString,
} = require("../utils/variantSpecifications");

const VARIANT_CREATE_FIELDS = [
  "product_id",
  "variantAttrs",
  "short_description",
  "heading",
  "price",
  "old_price",
  "stock",
  "specifications",
  "image",
];

function normalizeVariantAttrs(raw) {
  const parsed = parseJsonIfString(raw);
  const use = parsed !== undefined ? parsed : raw;
  if (use != null && typeof use === "object" && !Array.isArray(use)) {
    return use;
  }
  return {};
}

async function syncProductFromVariants(product_id) {
  const list = await ProductVariant.findAll({ where: { product_id } });
  if (list.length === 0) {
    await Product.update(
      { price: null, old_price: null, in_stock: false },
      { where: { id: product_id } }
    );
    return;
  }
  const nums = list
    .map((v) => Number(v.price))
    .filter((n) => !Number.isNaN(n));
  const minP = nums.length ? Math.min(...nums) : null;
  const minVar = minP != null ? list.find((v) => Number(v.price) === minP) : null;
  const oldP =
    minVar && minVar.old_price != null && minVar.old_price !== ""
      ? Number(minVar.old_price)
      : null;
  const anyStock = list.some((v) => Number(v.stock) > 0);
  await Product.update(
    {
      price: minP,
      old_price: Number.isFinite(oldP) ? oldP : null,
      in_stock: anyStock
    },
    { where: { id: product_id } }
  );
}

/**
 * multer `upload.any()` sets req.files to an array [{ fieldname, filename, ... }].
 * Older code assumed req.files[fieldname] — that only works with upload.fields().
 */
function filesGroupedByFieldname(req) {
  const raw = req.files;
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const by = {};
    for (const f of raw) {
      const name = f.fieldname;
      if (!name) continue;
      if (!by[name]) by[name] = [];
      by[name].push(f);
    }
    return by;
  }
  return raw;
}

function sanitizeStoredFilename(name) {
  if (typeof name !== "string") return "";
  const base = path.basename(name.trim());
  return base && base !== "." && base !== ".." ? base : "";
}

/* ================= BULK SAVE ================= */

exports.bulkSave = async (req, res) => {
  const product_id = parseInt(req.body.product_id, 10);
  if (!Number.isFinite(product_id) || product_id <= 0) {
    console.error(
      "product-variants/bulk: invalid product_id — if using axios+FormData, do not set Content-Type manually (boundary required)"
    );
    return res.status(400).json({ message: "Invalid or missing product_id" });
  }

  let variants = req.body.variants;
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (e) {
      return res.status(400).json({ message: "Invalid variants JSON" });
    }
  }
  if (!Array.isArray(variants)) {
    return res.status(400).json({ message: "variants must be an array" });
  }

  const filesByField = filesGroupedByFieldname(req);

  try {
    await sequelize.transaction(async (t) => {
      const oldVariants = await ProductVariant.findAll({
        where: { product_id },
        transaction: t,
      });

      const variantIds = oldVariants.map((v) => v.id);

      if (variantIds.length > 0) {
        await ProductVariantImage.destroy({
          where: { variant_id: variantIds },
          transaction: t,
        });
      }

      await ProductVariant.destroy({
        where: { product_id },
        transaction: t,
      });

      let variantIndex = 0;

      for (const v of variants) {
        const { specs, specsHeading, heading: variantHeading } =
          coerceIncomingVariantFields(v);

        const variant = await ProductVariant.create(
          {
            product_id,
            variantAttrs: normalizeVariantAttrs(v.attributes),
            short_description: v.short_description ?? null,
            heading: variantHeading,
            price: Number(v.price) || 0,
            old_price:
              v.old_price != null && v.old_price !== ""
                ? Number(v.old_price)
                : null,
            stock: Number(v.stock) || 0,
            specifications: normalizeVariantSpecificationsForStorage(
              specs,
              specsHeading
            ),
            image: v.image ? sanitizeStoredFilename(v.image) : null,
          },
          { fields: VARIANT_CREATE_FIELDS, transaction: t }
        );

        const newFiles = filesByField[`variant_images_${variantIndex}`] || [];

        const existingRaw =
          v.existing_images ??
          v.keep_images ??
          v.saved_images ??
          [];
        const existingList = Array.isArray(existingRaw) ? existingRaw : [];

        const rows = [];

        for (const item of existingList) {
          const fn =
            typeof item === "string"
              ? sanitizeStoredFilename(item)
              : sanitizeStoredFilename(
                  item?.image ?? item?.filename ?? item?.path ?? ""
                );
          if (fn) rows.push({ variant_id: variant.id, image: fn });
        }

        for (const file of newFiles) {
          if (file.filename) {
            rows.push({ variant_id: variant.id, image: file.filename });
          }
        }

        if (rows.length > 0) {
          await ProductVariantImage.bulkCreate(rows, { transaction: t });
        }

        variantIndex++;
      }
    });

    await syncProductFromVariants(product_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Ek variant delete karo (uski gallery images bhi).
 * Optional: ?product_id=123 — agar galat product ke saath match na ho to 400.
 * DELETE /api/product-variants/:id
 */
exports.removeOne = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid variant id" });
  }

  const queryPid =
    req.query.product_id != null
      ? parseInt(req.query.product_id, 10)
      : null;

  try {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (
      queryPid != null &&
      Number.isFinite(queryPid) &&
      variant.product_id !== queryPid
    ) {
      return res.status(400).json({
        message: "Variant does not belong to the given product",
      });
    }

    const product_id = variant.product_id;

    await sequelize.transaction(async (t) => {
      await ProductVariantImage.destroy({
        where: { variant_id: id },
        transaction: t,
      });
      await ProductVariant.destroy({ where: { id }, transaction: t });
    });

    await syncProductFromVariants(product_id);

    res.json({ success: true, product_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};