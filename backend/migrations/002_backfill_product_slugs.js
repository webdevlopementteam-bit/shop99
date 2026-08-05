// backend/migrations/002_backfill_product_slugs.js
//
// One-time backfill for products created before slug/meta_title/meta_description
// existed. Run once: node migrations/002_backfill_product_slugs.js
//
// - slug: generated from the product name, made unique (name collisions get
//   `-1`, `-2`, ... suffixes, same rule as new products).
// - meta_title: product name (only fields that are still empty are touched).
// - meta_description: first ~150-160 chars of the product's own
//   short_description, falling back to the first variant with a
//   short_description (that's actually where PDP copy lives in this app),
//   falling back to the product name if there's no description anywhere.

const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("../models/productModel");
const ProductVariant = require("../models/productVariantModel");
const { generateUniqueSlug, buildMetaDescription } = require("../utils/slugify");

async function firstVariantDescription(productId) {
  const variant = await ProductVariant.findOne({
    where: { product_id: productId },
    order: [["id", "ASC"]]
  });
  return variant ? String(variant.short_description || "").trim() : "";
}

async function run() {
  await sequelize.authenticate();

  const products = await Product.findAll({
    order: [["id", "ASC"]]
  });

  // Slugs already present (e.g. re-running this script) must count toward
  // uniqueness too, not just the ones generated in this run.
  const takenSlugs = new Set(
    (
      await sequelize.query("SELECT slug FROM products WHERE slug IS NOT NULL", {
        type: QueryTypes.SELECT
      })
    ).map((r) => r.slug)
  );

  let updated = 0;

  for (const product of products) {
    const patch = {};

    if (!product.slug || !product.slug.trim()) {
      const slug = await generateUniqueSlug(product.name, async (candidate) =>
        takenSlugs.has(candidate)
      );
      takenSlugs.add(slug);
      patch.slug = slug;
    } else {
      takenSlugs.add(product.slug);
    }

    if (!product.meta_title || !product.meta_title.trim()) {
      patch.meta_title = product.name;
    }

    if (!product.meta_description || !product.meta_description.trim()) {
      const source =
        (product.short_description && product.short_description.trim()) ||
        (await firstVariantDescription(product.id)) ||
        product.name;
      patch.meta_description = buildMetaDescription(source);
    }

    if (Object.keys(patch).length > 0) {
      await product.update(patch);
      updated += 1;
    }
  }

  console.log(`Backfill complete. ${updated}/${products.length} products updated.`);
  await sequelize.close();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
