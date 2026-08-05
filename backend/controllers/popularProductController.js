const PopularProduct = require("../models/popularProductModel");
const Product = require("../models/productModel");
const Offer = require("../models/offerModel");
const { Op } = require("sequelize");

const round2 = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
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
exports.addPopularProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !productIds.length) {
      return res.status(400).json({ message: "No products selected" });
    }

    const created = [];

    for (let id of productIds) {
      const exists = await PopularProduct.findOne({
        where: { product_id: id },
      });

      if (!exists) {
        const item = await PopularProduct.create({ product_id: id });
        created.push(item);
      }
    }

    res.json({ message: "Popular products added", data: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ================= */
exports.getPopularProducts = async (req, res) => {
  try {
    const data = await PopularProduct.findAll({
      include: [
        {
          model: Product,
          attributes: [
            "id",
            "category_id",
            "name",
            "slug",
            "price",
            "image",        // ✅ ADD THIS
            "in_stock",     // ✅ ADD THIS
            "old_price"
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    const products = data
      .map((item) => item.Product)
      .filter(Boolean);

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

      const offer = resolveProductOfferByIds(
        product.id,
        product.category_id,
        offers
      );
      const basePrice = Number(product.price);

      if (offer && Number.isFinite(basePrice)) {
        const discountedPrice = discountedPriceForOffer(basePrice, offer);
        if (Number.isFinite(discountedPrice)) {
          product.old_price = basePrice;
          product.price = discountedPrice;
        }
      }

      delete product.category_id;
      return json;
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= DELETE ================= */
exports.deletePopularProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await PopularProduct.destroy({
      where: { id },
    });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};