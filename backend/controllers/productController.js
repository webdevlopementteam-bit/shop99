// backend/controllers/productController.js

const { Op } = require("sequelize");
const {
  Product,
  Category,
  Brand,
  ProductVariant,
  ProductVariantImage,
  ProductShippingRate
} = require("../models/relations");
const Offer = require("../models/offerModel");
const ProductAttribute = require("../models/productAttributeModel");
const Attribute = require("../models/attributeModel");
const AttributeValue = require("../models/attributeValueModel");
const CategoryAttributeMap = require("../models/categoryAttributeMapModel");
const ProductImage = require("../models/productImageModel");
const sequelize = require("../config/db");
const {
  parseVariantSpecifications,
  normalizeVariantSpecificationsForStorage,
  specificationsHeadingFromStored,
  coerceIncomingVariantFields,
  parseJsonIfString,
} = require("../utils/variantSpecifications");
const {
  syncProductShipping,
  getShippingStateRatesObject
} = require("../services/shippingSync");
const {
  slugify,
  generateUniqueSlug,
  buildMetaDescription
} = require("../utils/slugify");



function round2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function bodyHasShipping(body) {
  return (
    body &&
    (body.shipping_mode != null ||
      body.shipping_flat_fee != null ||
      body.shipping_state_rates != null)
  );
}

/** First non-empty `short_description` in an incoming (not-yet-saved) variants payload. */
function firstNonEmptyVariantDescription(parsedVariants) {
  if (!Array.isArray(parsedVariants)) return "";
  for (const v of parsedVariants) {
    const d = String(v?.short_description || "").trim();
    if (d) return d;
  }
  return "";
}

/** Same, but for variants already saved in the DB (used when a save doesn't touch variants). */
async function firstVariantDescriptionFromDb(productId) {
  const variant = await ProductVariant.findOne({
    where: { product_id: productId },
    order: [["id", "ASC"]]
  });
  return variant ? String(variant.short_description || "").trim() : "";
}

async function slugTakenByOtherProduct(candidate, excludeId) {
  const where = { slug: candidate };
  if (excludeId != null) where.id = { [Op.ne]: excludeId };
  const existing = await Product.findOne({ where, attributes: ["id"] });
  return !!existing;
}

/**
 * Resolves the slug to save for a product.
 * - `requestedSlug` is `undefined` when the caller never sent a `slug` field at all
 *   (e.g. a partial update from Inventory) — the existing slug (or a freshly
 *   generated one, for new products) is kept untouched.
 * - `requestedSlug === ""` (field present but left blank) auto-generates from `name`.
 * - A non-empty `requestedSlug` is treated as a deliberate custom slug: it's
 *   sanitized and must be unique, or this returns an `error` instead of silently
 *   renaming it (auto-suffixing is only for the auto-generated-from-name case).
 */
async function resolveProductSlug({ name, requestedSlug, currentSlug, excludeId }) {
  const trimmed = requestedSlug != null ? String(requestedSlug).trim() : undefined;

  if (trimmed === undefined) {
    if (currentSlug) return { slug: currentSlug };
    const slug = await generateUniqueSlug(name, (c) => slugTakenByOtherProduct(c, excludeId));
    return { slug };
  }

  if (trimmed === "") {
    const slug = await generateUniqueSlug(name, (c) => slugTakenByOtherProduct(c, excludeId));
    return { slug };
  }

  const sanitized = slugify(trimmed);
  if (!sanitized) {
    return { error: "Custom slug must contain at least one letter or number." };
  }
  if (sanitized === currentSlug) return { slug: sanitized };
  if (await slugTakenByOtherProduct(sanitized, excludeId)) {
    return { error: `Slug "${sanitized}" is already in use. Please choose a different slug.` };
  }
  return { slug: sanitized };
}

const parseVariantsPayload = (raw) => {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

// Add this helper near top-level (after bodyHasShipping)
function shouldApplyOffersForRequest(req) {
  const includeOfferParam = String(req.query?.include_offer ?? "").toLowerCase();
  const client = String(req.headers?.["x-client"] ?? "").toLowerCase();

  if (includeOfferParam === "false" || includeOfferParam === "0") return false;
  if (client === "admin") return false;

  return true;
}

const resolveProductOffer = (product, offers) => {
  const productOffer = offers.find(
    (o) => o.apply_on === "product" && o.product_id === product.id
  );
  const categoryOffer = offers.find(
    (o) => o.apply_on === "category" && o.category_id === product.category_id
  );
  const globalOffer = offers.find((o) => o.apply_on === "all");
  return productOffer || categoryOffer || globalOffer;
};

const resolveProductOfferByIds = (productId, categoryId, offers) => {
  const pid = Number(productId);
  const cid = Number(categoryId);
  const productOffer = offers.find(
    (o) => o.apply_on === "product" && Number(o.product_id) === pid
  );
  const categoryOffer = offers.find(
    (o) => o.apply_on === "category" && Number(o.category_id) === cid
  );
  const globalOffer = offers.find((o) => o.apply_on === "all");
  return productOffer || categoryOffer || globalOffer || null;
};

const discountedPriceForOffer = (basePrice, offer) => {
  const base = Number(basePrice);
  if (!Number.isFinite(base) || base < 0 || !offer) return null;

  const discountValue = Number(offer.discount_value || 0);
  if (!Number.isFinite(discountValue) || discountValue <= 0) return round2(base);

  let discountAmount = discountValue;
  if (offer.discount_type === "percent" || offer.discount_type === "percentage") {
    discountAmount = (base * discountValue) / 100;
  }

  if (offer.max_discount != null && offer.max_discount !== "") {
    const maxDiscount = Number(offer.max_discount);
    if (Number.isFinite(maxDiscount) && maxDiscount >= 0) {
      discountAmount = Math.min(discountAmount, maxDiscount);
    }
  }

  return round2(Math.max(base - discountAmount, 0));
};

const shouldRestoreBasePriceFromOfferEcho = (submittedPrice, existingPrice, offer) => {
  const submitted = Number(submittedPrice);
  const existing = Number(existingPrice);
  if (!Number.isFinite(submitted) || !Number.isFinite(existing) || !offer) return false;
  const expectedDiscounted = discountedPriceForOffer(existing, offer);
  if (!Number.isFinite(expectedDiscounted)) return false;
  return Math.abs(round2(submitted) - round2(expectedDiscounted)) <= 0.01;
};

/** Listing/display price: min variant price when variants exist, else product row */
const effectiveBasePrice = (product) => {
  const rows = product.variants || [];
  if (rows.length) {
    const nums = rows.map((v) => {
      const j = typeof v.toJSON === "function" ? v.toJSON() : v;
      return Number(j.price);
    }).filter((n) => !Number.isNaN(n));
    if (nums.length) return Math.min(...nums);
  }
  return Number(product.price) || 0;
};

const effectiveBaseOldPrice = (product) => {
  const rows = product.variants || [];
  if (rows.length) {
    const minP = effectiveBasePrice(product);
    const match = rows.find((v) => {
      const j = typeof v.toJSON === "function" ? v.toJSON() : v;
      return Number(j.price) === minP;
    });
    if (match) {
      const j = typeof match.toJSON === "function" ? match.toJSON() : match;
      if (j.old_price != null && j.old_price !== "") return Number(j.old_price);
    }
  }
  return product.old_price != null ? Number(product.old_price) : null;
};

async function syncProductFromVariants(productId, transaction) {
  const list = await ProductVariant.findAll({
    where: { product_id: productId },
    transaction
  });
  if (list.length === 0) {
    await Product.update(
      { price: null, old_price: null, in_stock: false },
      { where: { id: productId }, transaction }
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
    { where: { id: productId }, transaction }
  );
}

/** Replaces all variants for a product (product_variants + product_variant_images) and syncs product price/stock. */
async function replaceProductVariants(productId, variantsPayload, transaction) {
  const oldVariants = await ProductVariant.findAll({
    where: { product_id: productId },
    transaction
  });
  const variantIds = oldVariants.map((v) => v.id);

  if (variantIds.length > 0) {
    await ProductVariantImage.destroy({
      where: { variant_id: variantIds },
      transaction
    });
  }

  await ProductVariant.destroy({
    where: { product_id: productId },
    transaction
  });

  for (const v of variantsPayload) {
    let rawAttrs = v.attributes ?? v.variantAttrs;
    rawAttrs = parseJsonIfString(rawAttrs);
    const variantAttrs =
      rawAttrs != null && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)
        ? rawAttrs
        : {};

    const { specs, specsHeading, heading: variantHeading } =
      coerceIncomingVariantFields(v);

    const variant = await ProductVariant.create(
      {
        product_id: productId,
        variantAttrs,
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
        image: v.image || null
      },
      { transaction }
    );

    const existingImages = Array.isArray(v.images) ? v.images : [];
    const rows = existingImages
      .map((item) => {
        if (typeof item === "string") {
          return item.trim() ? { variant_id: variant.id, image: item.trim() } : null;
        }
        if (item && typeof item.image === "string" && item.image.trim()) {
          return { variant_id: variant.id, image: item.image.trim() };
        }
        return null;
      })
      .filter(Boolean);

    if (rows.length > 0) {
      await ProductVariantImage.bulkCreate(rows, { transaction });
    }
  }

  await syncProductFromVariants(productId, transaction);
}

// Replace existing formatProductVariants with this
const formatProductVariants = (product, offer, { applyOffer = true } = {}) => {
  const rows = product.variants || [];

  return rows.map((v) => {
    const json = typeof v.toJSON === "function" ? v.toJSON() : v;

    const base = Number(json.price);
    let price = Number.isFinite(base) ? base : 0;


    const rawOld =
      json.old_price != null && json.old_price !== "" ? Number(json.old_price) : null;
    let old_price = Number.isFinite(rawOld) ? rawOld : null;

    // Storefront offer logic only
    if (applyOffer && offer && Number.isFinite(base)) {
      const discounted = discountedPriceForOffer(base, offer);
      if (Number.isFinite(discounted)) {
        price = discounted; // e.g. 399 -> 389
      }
      old_price = base; // storefront MRP should be base selling
    }

    const gallery = (json.images || []).map((img) =>
      typeof img === "object" && img.image != null ? img.image : img
    );

    const stock = Number(json.stock) || 0;

    return {
      id: json.id,
      product_id: json.product_id,
      attributes: json.variantAttrs ?? json.attributes,
      short_description: json.short_description ?? null,
      heading: json.heading ?? null,
      specifications: parseVariantSpecifications(json.specifications),
      specifications_heading: specificationsHeadingFromStored(
        json.specifications
      ),
      price,
      old_price,
      stock,
      stock_available: stock,
      in_stock: stock > 0,
      images: gallery,
      image: json.image || null
    };
  });
};


const applyOffer = (product, offers) => {

  let price = effectiveBasePrice(product);
  let old_price = effectiveBaseOldPrice(product);

  const offer = resolveProductOffer(product, offers);

  if (offer) {
    old_price = price;
    const discounted = discountedPriceForOffer(price, offer);
    price = Number.isFinite(discounted) ? discounted : price;
  }

  const json = product.toJSON();
  const formattedVariants = formatProductVariants(
    { ...json, variants: product.variants },
    offer
  );

  return {
    ...json,
    variants: formattedVariants,
    price,
    old_price
  };
};

// get all

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      sort
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (category) where["$Category.name$"] = category;
    if (brand) where["$Brand.name$"] = brand;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (inStock === "true") where.in_stock = true;

    let order = [["id", "DESC"]];
    if (sort === "low") order = [["price", "ASC"]];
    if (sort === "high") order = [["price", "DESC"]];
    if (sort === "newest") order = [["id", "DESC"]];

    const { rows, count } = await Product.findAndCountAll({
      where,
      distinct: true,
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
          required: !!category
        },
        {
          model: Brand,
          attributes: ["id", "name"],
          required: !!brand
        },
        {
          model: ProductAttribute,
          include: [
            { model: Attribute, attributes: ["name"] },
            { model: AttributeValue, attributes: ["value"] }
          ]
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "product_id",
            "variantAttrs",
            "short_description",
            "price",
            "old_price",
            "stock",
            "specifications",
            "image"
          ],
          include: [
            {
              model: ProductVariantImage,
              as: "images",
              attributes: ["image"]
            }
          ]
        }
      ],
      order,
      limit: parseInt(limit, 10),
      offset
    });

    const applyOffers = shouldApplyOffersForRequest(req);

    const offers = applyOffers
      ? await Offer.findAll({ where: { is_active: true } })
      : [];

    const products = await Promise.all(
      rows.map(async (product) => {
        let price = effectiveBasePrice(product);
        let old_price = effectiveBaseOldPrice(product);

        const grouped = {};
        product.ProductAttributes?.forEach((pa) => {
          const attr = pa.Attribute?.name;
          const value = pa.AttributeValue?.value;
          if (!attr || !value) return;
          if (!grouped[attr]) grouped[attr] = [];
          grouped[attr].push(value);
        });

        let formattedAttributes = Object.entries(grouped).map(
          ([attribute, values]) => ({
            attribute,
            values: [...new Set(values)]
          })
        );

        const hasProductAttributes =
          product.ProductAttributes && product.ProductAttributes.length > 0;

        if (!hasProductAttributes) {
          const categoryAttrs = await CategoryAttributeMap.findAll({
            where: { category_id: product.category_id },
            include: [{ model: Attribute, attributes: ["name"] }]
          });

          formattedAttributes = categoryAttrs.map((a) => ({
            attribute: a.Attribute?.name,
            values: []
          }));
        }

        let offer = null;
        if (applyOffers) {
          const productOffer = offers.find(
            (o) => o.apply_on === "product" && o.product_id === product.id
          );
          const categoryOffer = offers.find(
            (o) => o.apply_on === "category" && o.category_id === product.category_id
          );
          const globalOffer = offers.find((o) => o.apply_on === "all");
          offer = productOffer || categoryOffer || globalOffer;
        }

        if (applyOffers && offer) {
          old_price = price; // storefront MRP = base selling
          const discounted = discountedPriceForOffer(price, offer);
          price = Number.isFinite(discounted) ? discounted : price;
        }

        const formattedVariants = formatProductVariants(product, offer, {
          applyOffer: applyOffers
        });

        return {
          ...product.toJSON(),
          attributes: formattedAttributes,
          variants: formattedVariants,
          specifications:
            typeof product.specifications === "string"
              ? JSON.parse(product.specifications)
              : product.specifications,
          price,
          old_price
        };
      })
    );

    res.json({
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      data: products
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ================= GET ONE ================= */

// Replace exports.getOne with this
exports.getOne = async (req, res) => {
  try {
    const identifier = req.params.id;
    // Storefront links by slug (SEO-friendly URLs); admin/cart/order flows
    // still pass the numeric id — this endpoint transparently supports both.
    const lookupWhere = /^\d+$/.test(String(identifier))
      ? { id: identifier }
      : { slug: identifier };

    const product = await Product.findOne({
      where: lookupWhere,
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Brand, attributes: ["id", "name"] },
        {
          model: ProductAttribute,
          include: [
            { model: Attribute, attributes: ["name"] },
            { model: AttributeValue, attributes: ["value"] }
          ]
        },
        {
          model: ProductImage,
          as: "images",
          attributes: ["image"]
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "product_id",
            "variantAttrs",
            "short_description",
            "price",
            "old_price",
            "stock",
            "specifications",
            "image"
          ],
          include: [
            {
              model: ProductVariantImage,
              as: "images",
              attributes: ["image"]
            }
          ]
        }
      ]
    });

    if (!product) return res.status(404).json({ message: "Not found" });

    const applyOffers = shouldApplyOffersForRequest(req);

    const offers = applyOffers
      ? await Offer.findAll({ where: { is_active: true } })
      : [];

    let price = effectiveBasePrice(product);
    let old_price = effectiveBaseOldPrice(product);

    const offer = applyOffers ? resolveProductOffer(product, offers) : null;

    if (applyOffers && offer) {
      old_price = price; // storefront MRP = base selling
      const discounted = discountedPriceForOffer(price, offer);
      price = Number.isFinite(discounted) ? discounted : price;
    }

    const formattedVariants = formatProductVariants(product, offer, {
      applyOffer: applyOffers
    });

    const formattedAttributes =
      product.ProductAttributes?.map((pa) => ({
        attribute: pa.Attribute?.name,
        value: pa.AttributeValue?.value,
        attribute_id: pa.attribute_id,
        attribute_value_id: pa.attribute_value_id
      })) || [];

    const shipping_state_rates = await getShippingStateRatesObject(product.id);
    const pj = product.toJSON();

    res.json({
      ...pj,
      attributes: formattedAttributes,
      variants: formattedVariants,
      specifications:
        typeof product.specifications === "string"
          ? JSON.parse(product.specifications)
          : product.specifications,
      shipping_mode: pj.shipping_mode || "free",
      shipping_flat_fee: pj.shipping_flat_fee != null ? Number(pj.shipping_flat_fee) : 0,
      shipping_state_rates,
      price,
      old_price
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};



/* ================= CREATE ================= */

exports.create = async (req, res) => {
  try {

    const parsedVariants = parseVariantsPayload(req.body.variants);
    if (req.body.variants != null && parsedVariants == null) {
      return res.status(400).json({ message: "Invalid variants JSON" });
    }

    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const slugResult = await resolveProductSlug({
      name,
      requestedSlug: req.body.slug,
      currentSlug: null,
      excludeId: null
    });
    if (slugResult.error) {
      return res.status(400).json({ message: slugResult.error });
    }

    const metaTitle = String(req.body.meta_title || "").trim() || name;
    const metaDescription =
      String(req.body.meta_description || "").trim() ||
      buildMetaDescription(firstNonEmptyVariantDescription(parsedVariants) || name);

    const inStock =
      req.body.in_stock == 1 ||
      req.body.in_stock === true ||
      req.body.in_stock === "true" ||
      req.body.in_stock === "1";

    const product = await sequelize.transaction(async (t) => {
      const created = await Product.create(
        {
          category_id: parseInt(req.body.category_id),
          brand_id: req.body.brand_id ? parseInt(req.body.brand_id) : null,
          name,
          slug: slugResult.slug,
          meta_title: metaTitle,
          meta_description: metaDescription,
          sku:
            req.body.sku != null && String(req.body.sku).trim() !== ""
              ? String(req.body.sku).trim()
              : null,
          hsn:
            req.body.hsn != null && String(req.body.hsn).trim() !== ""
              ? String(req.body.hsn).trim()
              : null,
          fsn:
            req.body.fsn != null && String(req.body.fsn).trim() !== ""
              ? String(req.body.fsn).trim()
              : null,
          is_cod: req.body.is_cod == 1 ? 1 : 0,
          in_stock: inStock,
          price: null,
          old_price: null,

          // 🔥 FIX (req.files instead of req.file)
          image: req.files?.image ? req.files.image[0].filename : null
        },
        { transaction: t }
      );

      if (req.files?.gallery && req.files.gallery.length > 0) {
        const images = req.files.gallery.map((file) => ({
          product_id: created.id,
          image: file.filename
        }));
        await ProductImage.bulkCreate(images, { transaction: t });
      }

      if (Array.isArray(parsedVariants)) {
        await replaceProductVariants(created.id, parsedVariants, t);
      }

      return created;
    });

    console.log("FILES 👉", req.files);

    if (bodyHasShipping(req.body)) {
      await syncProductShipping(product.id, req.body);
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= UPDATE ================= */

exports.update = async (req, res) => {
  try {

    const productId = parseInt(req.params.id, 10);
    const parsedVariants = parseVariantsPayload(req.body.variants);
    if (req.body.variants != null && parsedVariants == null) {
      return res.status(400).json({ message: "Invalid variants JSON" });
    }

    const currentProduct = await Product.findByPk(productId, {
      attributes: ["id", "category_id", "slug", "name"]
    });
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const name = String(req.body.name || currentProduct.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    let slugPatch = {};
    if (req.body.slug !== undefined) {
      const slugResult = await resolveProductSlug({
        name,
        requestedSlug: req.body.slug,
        currentSlug: currentProduct.slug,
        excludeId: productId
      });
      if (slugResult.error) {
        return res.status(400).json({ message: slugResult.error });
      }
      slugPatch = { slug: slugResult.slug };
    }

    let metaPatch = {};
    if (req.body.meta_title !== undefined) {
      metaPatch.meta_title = String(req.body.meta_title).trim() || name;
    }
    if (req.body.meta_description !== undefined) {
      const source =
        firstNonEmptyVariantDescription(parsedVariants) ||
        (await firstVariantDescriptionFromDb(productId)) ||
        name;
      metaPatch.meta_description =
        String(req.body.meta_description).trim() || buildMetaDescription(source);
    }

    let safeVariantsPayload = parsedVariants;
    if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
      if (currentProduct) {
        const activeOffers = await Offer.findAll({
          where: { is_active: true }
        });
        const activeOffer = resolveProductOfferByIds(
          productId,
          req.body.category_id || currentProduct.category_id,
          activeOffers
        );

        if (activeOffer) {
          const existingVariants = await ProductVariant.findAll({
            where: { product_id: productId },
            attributes: ["id", "price", "old_price"]
          });
          const byId = new Map(existingVariants.map((v) => [Number(v.id), v]));

          safeVariantsPayload = parsedVariants.map((variant) => {
            const variantId = Number(variant?.id);
            const existing = Number.isFinite(variantId) ? byId.get(variantId) : null;
            if (!existing) return variant;

            if (!shouldRestoreBasePriceFromOfferEcho(variant.price, existing.price, activeOffer)) {
              return variant;
            }

            return {
              ...variant,
              // Preserve stored base price if frontend sent offer-adjusted value.
              price: Number(existing.price),
              old_price:
                existing.old_price != null && existing.old_price !== ""
                  ? Number(existing.old_price)
                  : null
            };
          });
        }
      }
    }

    const data = {
      category_id: parseInt(req.body.category_id),
      brand_id: req.body.brand_id ? parseInt(req.body.brand_id) : null,
      name,
      ...slugPatch,
      ...metaPatch,
      sku:
        req.body.sku != null && String(req.body.sku).trim() !== ""
          ? String(req.body.sku).trim()
          : null,
      hsn:
        req.body.hsn != null && String(req.body.hsn).trim() !== ""
          ? String(req.body.hsn).trim()
          : null,
      fsn:
        req.body.fsn != null && String(req.body.fsn).trim() !== ""
          ? String(req.body.fsn).trim()
          : null,
      is_cod: req.body.is_cod == 1 ? 1 : 0,
      in_stock:
        req.body.in_stock == 1 ||
        req.body.in_stock === true ||
        req.body.in_stock === "true" ||
        req.body.in_stock === "1"
    };

    /* 🔥 FIX IMAGE (because now using fields) */
    if (req.files?.image) {
      data.image = req.files.image[0].filename;
    }

    await sequelize.transaction(async (t) => {
      await Product.update(data, {
        where: { id: productId },
        transaction: t
      });

      if (Array.isArray(parsedVariants)) {
        await replaceProductVariants(productId, safeVariantsPayload, t);
      }

      /* 🔥 ADD THIS BLOCK (UPDATE GALLERY) */
      if (req.files?.gallery && req.files.gallery.length > 0) {

        // delete old images
        await ProductImage.destroy({
          where: { product_id: productId },
          transaction: t
        });

        const images = req.files.gallery.map(file => ({
          product_id: productId,
          image: file.filename
        }));

        await ProductImage.bulkCreate(images, { transaction: t });
      }
    });

    if (bodyHasShipping(req.body)) {
      await syncProductShipping(productId, req.body);
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE ================= */
exports.remove = async (req, res) => {
  try {

    await ProductShippingRate.destroy({
      where: { product_id: req.params.id }
    });

    await Product.destroy({
      where: { id: req.params.id }
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};


/* ================= GET LATEST PRODUCTS ================= */
exports.getLatestProducts = async (req, res) => {
  try {

    const products = await Product.findAll({
      include: [
        { model: Category, attributes: ["id", "name"] },
        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "product_id",
            "variantAttrs",
            "short_description",
            "price",
            "old_price",
            "stock",
            "specifications",
            "image"
          ],
          include: [
            {
              model: ProductVariantImage,
              as: "images",
              attributes: ["image"]
            }
          ]
        }
      ],
      order: [["id", "DESC"]],
      limit: 8
    });

    const offers = await Offer.findAll({
      where: { is_active: true }
    });

    const result = products.map(p => applyOffer(p, offers));

    res.json(result);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch latest products" });
  }
};

// searchSuggestion

exports.searchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) return res.json([]);

    const products = await Product.findAll({
      where: {
        name: {
          [Op.like]: `%${q}%`
        }
      },
      attributes: ["id", "name", "slug", "image"],
      limit: 5
    });

    res.json(products);

  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};
