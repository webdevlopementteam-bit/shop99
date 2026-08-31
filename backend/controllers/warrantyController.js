const Warranty = require("../models/warrantyModel");
const Order = require("../models/orderModel");

const ALLOWED_STATUSES = ["pending", "approved", "rejected", "completed"];
const ALLOWED_PURCHASE_SOURCES = ["shop99", "other"];

exports.createWarranty = async (req, res) => {
  try {
    const { order_id, name, mobile, email } = req.body;

    const purchaseSource = ALLOWED_PURCHASE_SOURCES.includes(req.body.purchase_source)
      ? req.body.purchase_source
      : "shop99";

    const trimmedName = String(name || "").trim();
    const trimmedMobile = String(mobile || "").trim();
    const trimmedEmail = String(email || "").trim();

    if (!trimmedName || !trimmedMobile || !trimmedEmail) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let orderPk = null;
    let orderNumber = null;
    let productName = null;

    if (purchaseSource === "shop99") {
      orderPk = Number(order_id);
      if (!Number.isFinite(orderPk)) {
        return res.status(400).json({ message: "Please select an order" });
      }

      const order = await Order.findByPk(orderPk);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      orderNumber = order.order_id;
      productName = order.product_name;
    }

    const invoice_url = req.file ? `uploads/${req.file.filename}` : null;

    const warranty = await Warranty.create({
      user_id: req.user?.id || null,
      purchase_source: purchaseSource,
      order_pk: orderPk,
      order_number: orderNumber,
      product_name: productName,
      name: trimmedName,
      mobile: trimmedMobile,
      email: trimmedEmail,
      invoice_url,
      status: "pending",
    });

    return res.status(201).json({ success: true, data: warranty });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getMyWarranties = async (req, res) => {
  try {
    const rows = await Warranty.findAll({
      where: { user_id: req.user.id },
      order: [["id", "DESC"]],
    });
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllWarranties = async (req, res) => {
  try {
    const rows = await Warranty.findAll({
      order: [["id", "DESC"]],
    });
    return res.json({ data: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateWarrantyStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const warranty = await Warranty.findByPk(req.params.id);
    if (!warranty) {
      return res.status(404).json({ message: "Warranty request not found" });
    }

    await warranty.update({ status });

    return res.json({ success: true, data: warranty });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
