const Deal = require("../models/dealModel");
const Product = require("../models/productModel");
const Offer = require("../models/offerModel");
const { Op } = require("sequelize");

const round2 = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const discountedPriceForDeal = (basePrice, discountType, discountValue) => {
  const base = Number(basePrice);
  const value = Number(discountValue || 0);

  if (!Number.isFinite(base) || base < 0) return null;
  if (!Number.isFinite(value) || value <= 0) return round2(base);

  let discountAmount = value;
  if (discountType === "percent" || discountType === "percentage") {
    discountAmount = (base * value) / 100;
  }

  return round2(Math.max(base - discountAmount, 0));
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

const resolveProductOfferByIds = (productId, categoryId, offers) => {
  const pid = Number(productId);
  const cid = Number(categoryId);

  const productOffer = offers.find(
    (offer) => offer.apply_on === "product" && Number(offer.product_id) === pid
  );
  const categoryOffer = offers.find(
    (offer) => offer.apply_on === "category" && Number(offer.category_id) === cid
  );
  const globalOffer = offers.find((offer) => offer.apply_on === "all");

  return productOffer || categoryOffer || globalOffer || null;
};

/* ================= ADD ================= */
exports.addDeals = async (req, res) => {
  try {
    const { deals, productIds, discount_type, discount_value } = req.body;

    const normalizedDeals = Array.isArray(deals)
      ? deals
      : Array.isArray(productIds)
      ? productIds.map((productId) => ({
          product_id: productId,
          discount_type: discount_type || "percent",
          discount_value:
            discount_value !== undefined ? Number(discount_value) : 0,
        }))
      : [];

    if (!normalizedDeals.length) {
      return res.status(400).json({ message: "No deals selected" });
    }

    const created = [];

    for (const item of normalizedDeals) {
      const productId = Number(item.product_id);
      const type = item.discount_type;
      const value = Number(item.discount_value);

      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!["flat", "percent"].includes(type)) continue;
      if (!Number.isFinite(value) || value < 0) continue;

      const exists = await Deal.findOne({
        where: { product_id: productId },
      });

      if (!exists) {
        const newDeal = await Deal.create({
          product_id: productId,
          discount_type: type,
          discount_value: value,
        });
        created.push(newDeal);
      } else {
        await exists.update({
          discount_type: type,
          discount_value: value,
        });
      }
    }

    res.json({ message: "Deals added", data: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ================= */
exports.getDeals = async (req, res) => {
  try {
    const data = await Deal.findAll({
      include: [
        {
          model: Product,
          attributes: [
            "id",
            "category_id",
            "name",
            "slug",
            "price",
            "image",
            "in_stock",
            "old_price",
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    const products = data.map((item) => item.Product).filter(Boolean);
    const productIds = products.map((product) => product.id);
    const categoryIds = [
      ...new Set(products.map((product) => product.category_id).filter(Boolean)),
    ];
    const now = new Date();
    const offers =
      productIds.length > 0
        ? await Offer.findAll({
            where: {
              is_active: true,
              begin_on: { [Op.lte]: now },
              end_on: { [Op.gte]: now },
              [Op.or]: [
                { apply_on: "all" },
                { apply_on: "product", product_id: { [Op.in]: productIds } },
                { apply_on: "category", category_id: { [Op.in]: categoryIds } },
              ],
            },
          })
        : [];

    const response = data.map((item) => {
      const json = item.toJSON();
      const product = json.Product;

      if (!product) return json;

      const basePrice = Number(product.price);
      const offer = resolveProductOfferByIds(
        product.id,
        product.category_id,
        offers
      );
      const discountedPrice = offer
        ? discountedPriceForOffer(basePrice, offer)
        : discountedPriceForDeal(basePrice, json.discount_type, json.discount_value);

      if (Number.isFinite(discountedPrice)) {
        product.old_price = basePrice;
        product.price = discountedPrice;
      }

      delete product.category_id;

      return json;
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= UPDATE ================= */
exports.updateDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, discount_type, discount_value } = req.body;

    const deal = await Deal.findByPk(id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    const updates = {};

    if (product_id !== undefined) {
      const productId = Number(product_id);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product_id" });
      }

      const duplicate = await Deal.findOne({
        where: { product_id: productId },
      });
      if (duplicate && duplicate.id !== deal.id) {
        return res
          .status(400)
          .json({ message: "Deal already exists for this product" });
      }

      updates.product_id = productId;
    }

    if (discount_type !== undefined) {
      if (!["flat", "percent"].includes(discount_type)) {
        return res.status(400).json({ message: "Invalid discount_type" });
      }
      updates.discount_type = discount_type;
    }

    if (discount_value !== undefined) {
      const value = Number(discount_value);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ message: "Invalid discount_value" });
      }
      updates.discount_value = value;
    }

    await deal.update(updates);

    const updatedDeal = await Deal.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ["id", "name", "slug", "price", "image", "in_stock", "old_price"],
        },
      ],
    });

    const json = updatedDeal.toJSON();
    const product = json.Product;

    if (product) {
      const basePrice = Number(product.price);
      const discountedPrice = discountedPriceForDeal(
        basePrice,
        json.discount_type,
        json.discount_value
      );

      if (Number.isFinite(discountedPrice)) {
        product.old_price = basePrice;
        product.price = discountedPrice;
      }
    }

    res.json({ message: "Deal updated successfully", data: json });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= DELETE ================= */
exports.deleteDeal = async (req, res) => {
  try {
    const { id } = req.params;

    await Deal.destroy({
      where: { id },
    });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
