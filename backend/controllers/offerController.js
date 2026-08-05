const Offer = require("../models/offerModel");
const Product = require("../models/productModel");
const OfferUsage = require("../models/offerUsageModel");

const { Op } = require("sequelize");

/* ================= GET OFFERS ================= */
exports.getOffers = async (req, res) => {
  try {
   const today = new Date();
today.setHours(0, 0, 0, 0);

await Offer.update(
  { is_active: false },
  {
    where: {
      end_on: { [Op.lt]: today },
      is_active: true,
    },
  }
);

    // 🔥 Fetch with Product JOIN
    const offers = await Offer.findAll({
      include: [
        {
          model: Product,
          attributes: ["id", "name", "image", "price"],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(offers);

  } catch (err) {
    console.error("GET OFFERS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= CREATE ================= */
exports.createOffer = async (req, res) => {
  try {
    let data = { ...req.body };

    // APPLY LOGIC (same as coupon)
    if (data.apply_on === "product") data.category_id = null;
    if (data.apply_on === "category") data.product_id = null;
    if (data.apply_on === "all") {
      data.product_id = null;
      data.category_id = null;
    }

    // VALIDATION
    if (!data.offer_name || !data.discount_value) {
      return res.status(400).json({
        message: "Offer name and discount required",
      });
    }

    const offer = await Offer.create(data);

    res.status(201).json({
      message: "Offer Created",
      data: offer,
    });

  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= UPDATE ================= */
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;

    let data = { ...req.body };

    // APPLY LOGIC
    if (data.apply_on === "product") data.category_id = null;
    if (data.apply_on === "category") data.product_id = null;
    if (data.apply_on === "all") {
      data.product_id = null;
      data.category_id = null;
    }

    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    await offer.update(data);

    res.json({ message: "Offer Updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE ================= */
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    await offer.destroy();

    res.json({
      message: "Offer deleted successfully",
    });

  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

exports.toggleStatus = async (req, res) => {
  const offer = await Offer.findByPk(req.params.id);

  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  offer.is_active = !offer.is_active;
  await offer.save();

  res.json({
    message: "Status updated",
    data: offer,
  });
};

exports.applyOffer = async (req, res) => {
  try {
    const { offer_id, price, product_id } = req.body;

    // ✅ VALIDATION
    if (!offer_id || !price || price <= 0) {
      return res.status(400).json({
        message: "Invalid data",
      });
    }

    // ✅ FETCH OFFER WITH PRODUCTS
    const offer = await Offer.findOne({
      where: {
        id: offer_id,
        is_active: true,
      },
      include: [
        {
          model: Product,
          attributes: ["id"],

        },
      ],
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

const today = new Date();
today.setHours(0, 0, 0, 0);

const begin = offer.begin_on ? new Date(offer.begin_on) : null;
const end = offer.end_on ? new Date(offer.end_on) : null;

// 🔥 normalize
if (begin) begin.setHours(0, 0, 0, 0);
if (end) end.setHours(23, 59, 59, 999);

console.log("TODAY:", today);
console.log("BEGIN:", begin);
console.log("END:", end);

// ✅ correct comparison
if (begin && begin > today) {
  return res.status(400).json({
    message: "Offer not started yet",
  });
}

if (end && end < today) {
  return res.status(400).json({
    message: "Offer expired",
  });
}
    // ✅ USAGE LIMIT CHECK
    if (
      offer.usage_limit !== null &&
      offer.used_count >= offer.usage_limit
    ) {
      return res.status(400).json({
        message: "Offer usage limit reached",
      });
    }

    // ✅ PRODUCT VALIDATION (ONLY for product type offers)
    if (offer.apply_on === "product"){
      if (!product_id) {
        return res.status(400).json({
          message: "Product ID required for this offer",
        });
      }

      const productIds = offer.Product ? [offer.Product.id] : [];

      if (!productIds.includes(Number(product_id))) {
        return res.status(400).json({
          message: "Offer not valid for this product",
        });
      }
    }

    // ✅ DISCOUNT LOGIC
    let discount = 0;

    // if (offer.discount_type === "percentage") {
    //   discount = (price * Number(offer.discount_value)) / 100;
    // } else {
    //   discount = Number(offer.discount_value || 0);
    // }
        
        if (offer.discount_type === "percent") {
          discount = (price * Number(offer.discount_value)) / 100;
        } else {
          discount = Number(offer.discount_value || 0);
        }
        
    // ✅ MAX DISCOUNT LIMIT
    if (offer.max_discount && discount > offer.max_discount) {
      discount = Number(offer.max_discount);
    }

    const finalPrice = Math.max(price - discount, 0);

    // ✅ INCREMENT USAGE COUNT
    await offer.increment("used_count");

    // ✅ RESPONSE
    res.json({
      success: true,
      discount,
      finalPrice,
      offer_id: offer.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Apply offer failed",
    });
  }
};