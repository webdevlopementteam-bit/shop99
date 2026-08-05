

const Order = require("../models/orderModel");
const { createInvoicePDF, createLabelPDF } = require("../services/pdfService");
const { notifyOrderStatusChangeAsync } = require("../services/orderStatusSms");

const path = require("path");
const fs = require("fs");


function getFrontendUrl() {
  return String(process.env.FRONTEND_URL || "https://www.shop99.co.in").replace(/\/$/, "");
}

function rootDir() {
  return path.join(__dirname, "..");
}

function resolveUploadPath(rel) {
  if (!rel) return null;
  return path.join(rootDir(), String(rel).trim().replace(/^\/+/, ""));
}

function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function hasBankDetails(payload = {}) {
  return Boolean(
    String(payload.refund_account_number || "").trim() &&
      String(payload.refund_ifsc || "").trim(),
  );
}


function pickRefundPayload(body = {}) {
  const src = body.refund && typeof body.refund === "object" ? body.refund : body;
  return {
    refund_amount: src.refund_amount ?? src.amount ?? null,
    refund_method: src.refund_method ?? src.method ?? null,
    refund_reason: src.refund_reason ?? src.reason ?? null,
    refund_reference: src.refund_reference ?? src.reference ?? null,
    refund_account_holder: src.refund_account_holder ?? src.account_holder ?? null,
    refund_account_number: src.refund_account_number ?? src.account_number ?? null,
    refund_ifsc: src.refund_ifsc ?? src.ifsc ?? null,
    refund_upi_id: src.refund_upi_id ?? src.upi_id ?? null,
  };
}

function calculateRefundAmount(order) {
  const qty = num(order.qty, 1);
  const base = qty * num(order.rate);
  return Number((base + num(order.cgst) + num(order.sgst) + num(order.igst)).toFixed(2));
}

const RETURN_REPLACE_WINDOW_DAYS = 7;

function getReturnReplaceWindowState(order) {
  const dateCandidates = [
    order?.delivered_date,
    order?.deliveredDate,
    order?.order_date,
    order?.createdAt,
  ];

  const anchorRaw = dateCandidates.find((v) => v != null && String(v).trim() !== "");
  if (!anchorRaw) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const anchorDate = new Date(anchorRaw);
  if (Number.isNaN(anchorDate.getTime())) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const now = new Date();
  const diffMs = now.getTime() - anchorDate.getTime();
  if (diffMs <= 0) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return {
    withinWindow: daysPassed <= RETURN_REPLACE_WINDOW_DAYS,
    daysPassed,
  };
}

async function ensureInvoicePdf(orderInstance) {
  // ✅ convert to plain for PDF
  const order = orderInstance.get({ plain: true });

  const url = await createInvoicePDF(order);

  // ✅ use instance for DB update
  await orderInstance.update({ invoice_url: url });
  await orderInstance.reload();

  return resolveUploadPath(url);
}

async function ensureLabelPdf(orderInstance) {
  const order = orderInstance.get({ plain: true });

  const url = await createLabelPDF(order);

  await orderInstance.update({ shipping_label_url: url });
  await orderInstance.reload();

  return resolveUploadPath(url);
}

// GetOrder

exports.getOrders = async (req, res) => {
  try {
    const data = await Order.findAll({
      order: [["id", "DESC"]],
    });

    const normalized = data.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return {
        ...plain,
        delivery_date: "3-7 days",
        status: plain.status,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

// update shipping

exports.updateShipping = async (req, res) => {
  try {
    const { id } = req.params;

    const { delivery_date, shipping_partner, tracking_id, tracking_link } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.update({
      shipping_date: new Date(),
      shipped_status_date: new Date(),
      delivery_date,
      shipping_partner,
      tracking_id,
      tracking_link,
      status: "shipped",
    });

    res.json({
      success: true,
      message: "Shipping updated",
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// update status

// exports.updateStatus = async (req, res) => {
//   try {
//     const status = req.body?.status;

//     const order = await Order.findByPk(req.params.id);

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     const prevStatus = order.status;

//     let updateData = { status };

//     // ✅ AUTO SET DELIVERED DATE
//     if (status === "delivered") {
//       updateData.delivered_date = new Date();
//     }

//     // OPTIONAL: reset if status changed back
//     if (status !== "delivered") {
//       updateData.delivered_date = null;
//     }

//     await order.update(updateData);

//     notifyOrderStatusChangeAsync(order, prevStatus, status);

//     res.json({
//       success: true,
//       data: order,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.updateStatus = async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const prevStatus = order.status;
    const prevStatusNorm = String(prevStatus || "").trim().toLowerCase();

    const now = new Date();

    let updateData = { status };

    // Save date only when status newly reaches that step
    if (status === "confirmed" && prevStatusNorm !== "confirmed") {
      updateData.confirmed_date = now;
    }

    if (status === "processing" && prevStatusNorm !== "processing") {
      updateData.processing_date = now;
    }

    if (status === "shipped" && prevStatusNorm !== "shipped") {
      updateData.shipped_status_date = now;
      updateData.shipping_date = now;
    }

    if (status === "delivered" && prevStatusNorm !== "delivered") {
      updateData.delivered_date = now;
    }

    // If moved back from delivered, clear delivered date
    if (status !== "delivered") {
      updateData.delivered_date = null;
    }

    await order.update(updateData);
    await order.reload();

    notifyOrderStatusChangeAsync(order, prevStatus, status);

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// generate invoice
exports.generateInvoice = async (req, res) => {
  try {
    const orderInstance = await Order.findByPk(req.params.id);

    if (!orderInstance) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ FIX: convert Sequelize instance → plain object
    const order = orderInstance.get({ plain: true });

    // ✅ pass plain object to PDF
    const url = await createInvoicePDF(order);

    // ✅ update using instance
    await orderInstance.update({ invoice_url: url });
    await orderInstance.reload();

    res.json({
      success: true,
      url,
      invoice_url: url,
      data: orderInstance,
    });
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// generate label

exports.generateLabel = async (req, res) => {
  try {
    const orderInstance = await Order.findByPk(req.params.id);

    if (!orderInstance) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ FIX: convert to plain object
    const order = orderInstance.get({ plain: true });

    // ✅ pass plain object to PDF
    const url = await createLabelPDF(order);

    // ✅ update using instance
    await orderInstance.update({ shipping_label_url: url });
    await orderInstance.reload();

    res.json({
      success: true,
      url,
      shipping_label_url: url,
      data: orderInstance,
    });
  } catch (err) {
    console.error("LABEL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// upadteReturn

exports.updateReturnReplacement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      return_status,
      replacement_status,
      return_reason,
      replacement_reason,
      reason,
    } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const prevReplacementStatus = order.replacement_status;

    const normalizedStatus = String(order.status ?? "").trim().toLowerCase();
    const requestingReturn =
      String(return_status ?? "").trim().toLowerCase() === "requested";
    const requestingReplacement =
      String(replacement_status ?? "").trim().toLowerCase() === "requested";

    if (requestingReturn || requestingReplacement) {
      if (normalizedStatus !== "delivered") {
        return res.status(400).json({
          message:
            "Return/Replacement request is allowed only for delivered orders.",
        });
      }

      const requestWindow = getReturnReplaceWindowState(order);
      if (!requestWindow.withinWindow) {
        return res.status(400).json({
          message: `Return/Replacement request is allowed only within ${RETURN_REPLACE_WINDOW_DAYS} days of delivery.`,
        });
      }
    }

    const updateData = {
      return_status: return_status || order.return_status,
      replacement_status: replacement_status || order.replacement_status,
    };
    const now = new Date();
        if (return_status === "requested" && order.return_status !== "requested") {
          updateData.return_requested_date = now;
        }
        if (return_status === "approved" && order.return_status !== "approved") {
          updateData.return_approved_date = now;
        }
        if (return_status === "completed" && order.return_status !== "completed") {
          updateData.return_completed_date = now;
        }
        if (
          replacement_status === "requested" &&
          order.replacement_status !== "requested"
        ) {
          updateData.replacement_requested_date = now;
        }
        if (
          replacement_status === "approved" &&
          order.replacement_status !== "approved"
        ) {
          updateData.replacement_approved_date = now;
        }
        if (
          replacement_status === "shipped" &&
          order.replacement_status !== "shipped"
        ) {
          updateData.replacement_shipped_date = now;
        }
        if (
          replacement_status === "delivered" &&
          order.replacement_status !== "delivered"
        ) {
          updateData.replacement_delivered_date = now;
        }

    if (return_reason != null || (return_status && reason != null)) {
      updateData.return_reason = return_reason ?? reason;
    }

    if (replacement_reason != null || (replacement_status && reason != null)) {
      updateData.replacement_reason = replacement_reason ?? reason;
    }

    const refundPayload = pickRefundPayload(req.body);

    if (refundPayload.refund_account_holder != null) {
      updateData.refund_account_holder = refundPayload.refund_account_holder;
    }
    if (refundPayload.refund_account_number != null) {
      updateData.refund_account_number = refundPayload.refund_account_number;
    }
    if (refundPayload.refund_ifsc != null) {
      updateData.refund_ifsc = refundPayload.refund_ifsc;
    }
    if (refundPayload.refund_upi_id != null) {
      updateData.refund_upi_id = refundPayload.refund_upi_id;
    }

    const returnApprovedNow =
      return_status === "approved" && order.return_status !== "approved";

    if (returnApprovedNow) {
      const derivedRefundAmount =
        refundPayload.refund_amount != null
          ? Number(refundPayload.refund_amount)
          : calculateRefundAmount(order);

      updateData.refund_amount = Number.isFinite(derivedRefundAmount)
        ? derivedRefundAmount
        : calculateRefundAmount(order);

      updateData.refund_method = refundPayload.refund_method || "bank_transfer";
      updateData.refund_reason =
        refundPayload.refund_reason || "Return approved by admin";
      updateData.refund_requested_at = new Date();

      const paymentMode = String(order.payment_mode || "")
        .trim()
        .toLowerCase();

      const bankProvided =
        hasBankDetails({
          refund_account_number:
            refundPayload.refund_account_number || order.refund_account_number,
          refund_ifsc: refundPayload.refund_ifsc || order.refund_ifsc,
        }) || Boolean(refundPayload.refund_upi_id || order.refund_upi_id);

      if (paymentMode === "cod" && !bankProvided) {
        updateData.refund_status = "pending_bank_details";
      } else {
        updateData.refund_status = "pending";
      }
    }

    await order.update(updateData);
    await order.reload();

    const nextReplacementStatus = String(order.replacement_status || "")
      .trim()
      .toLowerCase();

    const prevReplacement = String(prevReplacementStatus || "")
      .trim()
      .toLowerCase();

    if (
      replacement_status &&
      nextReplacementStatus !== prevReplacement &&
      ["shipped", "delivered"].includes(nextReplacementStatus)
    ) {
      notifyOrderStatusChangeAsync(
        order,
        prevReplacementStatus,
        nextReplacementStatus,
      );
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { refund_status } = req.body;

    const allowed = [
      "none",
      "pending",
      "pending_bank_details",
      "processing",
      "refunded",
      "failed",
      "not_required",
    ];

    if (!allowed.includes(refund_status)) {
      return res.status(400).json({ message: "Invalid refund_status" });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const p = pickRefundPayload(req.body);
    const updateData = { refund_status };

    if (p.refund_amount != null) updateData.refund_amount = p.refund_amount;
    if (p.refund_method != null) updateData.refund_method = p.refund_method;
    if (p.refund_reason != null) updateData.refund_reason = p.refund_reason;
    if (p.refund_reference != null) updateData.refund_reference = p.refund_reference;
    if (p.refund_account_holder != null)
      updateData.refund_account_holder = p.refund_account_holder;
    if (p.refund_account_number != null)
      updateData.refund_account_number = p.refund_account_number;
    if (p.refund_ifsc != null) updateData.refund_ifsc = p.refund_ifsc;
    if (p.refund_upi_id != null) updateData.refund_upi_id = p.refund_upi_id;

    if (!order.refund_requested_at) {
      updateData.refund_requested_at = new Date();
    }
    if (refund_status === "refunded") {
      updateData.refund_processed_at = new Date();
    }

    await order.update(updateData);
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// download label

exports.downloadLabel = async (req, res) => {
  try {
    const orderInstance = await Order.findByPk(req.params.id);

    if (!orderInstance) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ensureLabelPdf expects Sequelize instance (for update/reload)
    const filePath = await ensureLabelPdf(orderInstance);

    console.log("LABEL PATH:", filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Label file not found" });
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.download(filePath, `label-${orderInstance.order_id}.pdf`, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).end();
      }
    });
  } catch (err) {
    console.error("LABEL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ḍownload Invoice

exports.downloadInvoice = async (req, res) => {
  try {
    const orderInstance = await Order.findByPk(req.params.id);

    if (!orderInstance) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ensureInvoicePdf expects Sequelize instance (for update/reload)
    const filePath = await ensureInvoicePdf(orderInstance);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.download(filePath, `invoice-${orderInstance.order_id}.pdf`);
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};




// today code 

exports.payuSuccess = async (req, res) => {
  try {
    const txnid = req.body?.txnid || req.query?.txnid;
    const payuStatus = String(req.body?.status || req.query?.status || "").toLowerCase();

    if (!txnid) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failure?reason=missing_txnid`);
    }

    const order = await Order.findOne({ where: { txnid } });

    if (!order) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failure?reason=order_not_found&txnid=${encodeURIComponent(txnid)}`,
      );
    }

    if (payuStatus && payuStatus !== "success") {
      await order.update({ status: "failed" });

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failure?txnid=${encodeURIComponent(txnid)}`,
      );
    }

    // await order.update({ status: "confirmed" });
    await order.update({
  status: "confirmed",
  confirmed_date: order.confirmed_date || new Date(),
});
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?order_id=${encodeURIComponent(
        order.order_id,
      )}&txnid=${encodeURIComponent(txnid)}`,
    );
  } catch (err) {
    console.error("PAYU SUCCESS ERROR:", err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failure?reason=server_error`);
  }
};

exports.payuFailure = async (req, res) => {
  try {
    console.log("PAYU FAILURE BODY:", req.body);
    const txnid = req.body?.txnid || req.query?.txnid;
    if (!txnid) {
      return res.redirect(`${getFrontendUrl()}/payment-failure?reason=missing_txnid`);
    }
    const order = await Order.findOne({ where: { txnid } });
    if (order && !["confirmed", "delivered", "shipped"].includes(String(order.status || "").toLowerCase())) {
      await order.update({ status: "failed" });
    }
    return res.redirect(
      `${getFrontendUrl()}/payment-failure?txnid=${encodeURIComponent(txnid)}`,
    );
  } catch (err) {
    console.error("PAYU FAILURE ERROR:", err);
    return res.redirect(`${getFrontendUrl()}/payment-failure?reason=server_error`);
  }
};