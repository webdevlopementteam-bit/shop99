const Coupon = require("../models/couponModel");

/* ================= CREATE COUPON ================= */

exports.createCoupon = async (req, res) => {
  try {

    const data = {
      ...req.body,
      product_id: req.body.product_id || null,
      category_id: req.body.category_id || null
    };

    const coupon = await Coupon.create(data);

    res.json({
      success: true,
      data: coupon
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Coupon creation failed" });
  }
};


/* ================= GET ALL COUPONS ================= */

exports.getCoupons = async (req, res) => {
  try {

    const coupons = await Coupon.findAll({
      order: [["id", "DESC"]]
    });

    res.json(coupons);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
};


/* ================= UPDATE COUPON ================= */

exports.updateCoupon = async (req, res) => {
  try {

    const { id } = req.params;

    await Coupon.update(req.body, {
      where: { id }
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "Coupon update failed" });
  }
};


/* ================= DELETE COUPON ================= */

exports.deleteCoupon = async (req, res) => {
  try {

    const { id } = req.params;

    await Coupon.destroy({
      where: { id }
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "Coupon delete failed" });
  }
};


/* ================= APPLY COUPON ================= */


exports.applyCoupon = async (req, res) => {
  try {

    const { code, price } = req.body;

    const coupon = await Coupon.findOne({
      where: {
        code,
        is_active: true
      }
    });

    if (!coupon) {
      return res.status(404).json({
        message: "Invalid Coupon"
      });
    }
const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const begin = coupon.begin_on
  ? new Date(coupon.begin_on).toLocaleDateString("en-CA")
  : null;

const end = coupon.end_on
  ? new Date(coupon.end_on).toLocaleDateString("en-CA")
  : null;

console.log("TODAY:", today);
console.log("BEGIN:", begin);
console.log("END:", end);

if ((begin && begin > today) || (end && end < today)) {
  return res.status(400).json({
    message: "Coupon expired"
  });
}

    // ✅ USAGE LIMIT CHECK
    if (
      coupon.usage_limit !== null &&
      coupon.used_count >= coupon.usage_limit
    ) {
      return res.status(400).json({
        message: "Coupon usage limit reached"
      });
    }

    // 🔥 ✅ UPDATED DISCOUNT LOGIC (IMPORTANT)
    let discount = 0;

    if (coupon.discount_type === "percentage") {
      discount = (price * Number(coupon.discount_value)) / 100;
    } else {
      discount = Number(coupon.discount_value || 0);
    }

    // ✅ OPTIONAL: max discount cap
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = Number(coupon.max_discount);
    }

    const finalPrice = Math.max(price - discount, 0);

    // ✅ increment usage
    await coupon.increment("used_count");

    res.json({
      success: true,
      discount,
      finalPrice
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Coupon apply failed"
    });
  }
};