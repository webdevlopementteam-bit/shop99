// Optional: same behaviour as orderController.generateInvoice — use if you mount this on a route.
const Order = require("../models/orderModel");
const { createInvoicePDF } = require("./pdfService");

exports.generateInvoice = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const url = await createInvoicePDF(order);
    await order.update({ invoice_url: url });
    await order.reload();

    res.json({
      success: true,
      url,
      invoice_url: url,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
