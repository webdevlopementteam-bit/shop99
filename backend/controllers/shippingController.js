const { Product } = require("../models/relations");
const { INDIAN_STATES } = require("../constants/indianStates");
const {
  syncProductShipping,
  getShippingStateRatesObject
} = require("../services/shippingSync");

/** GET /api/shipping/states — list of states/UTs for dropdowns */
exports.getStates = (req, res) => {
  res.json({ states: INDIAN_STATES });
};


exports.getProductShipping = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findByPk(productId, {
      attributes: ["id", "shipping_mode", "shipping_flat_fee"]
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const j = product.toJSON();
    const shipping_state_rates = await getShippingStateRatesObject(productId);

    res.json({
      product_id: productId,
      shipping_mode: j.shipping_mode || "free",
      shipping_flat_fee: Number(j.shipping_flat_fee) || 0,
      shipping_state_rates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load shipping" });
  }
};


exports.putProductShipping = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const exists = await Product.findByPk(productId, { attributes: ["id"] });
    if (!exists) {
      return res.status(404).json({ message: "Product not found" });
    }

    await syncProductShipping(productId, req.body);

    const shipping_state_rates = await getShippingStateRatesObject(productId);
    const updated = await Product.findByPk(productId, {
      attributes: ["shipping_mode", "shipping_flat_fee"]
    });
    const j = updated.toJSON();

    res.json({
      success: true,
      product_id: productId,
      shipping_mode: j.shipping_mode || "free",
      shipping_flat_fee: Number(j.shipping_flat_fee) || 0,
      shipping_state_rates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to save shipping" });
  }
};
