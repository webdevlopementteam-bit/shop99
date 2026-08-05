
const crypto = require("crypto");
const payu = require("../config/payuConfig");
const Order = require("../models/orderModel");
const UserAddress = require("../models/userAddressModel");
const { Product, Category } = require("../models/relations");
const { notifyOrderStatusChangeAsync } = require("../services/orderStatusSms");

function round2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}


function serializeOrderVariantSelection(body) {
  const b = body || {};
  const pick = (...keys) => {
    for (const k of keys) {
      if (b[k] != null && b[k] !== "") return b[k];
    }
    return null;
  };

  const variantIdRaw = pick(
    "product_variant_id",
    "variant_id",
    "productVariantId",
    "selected_variant_id",
    "selectedVariantId"
  );
  const detailsRaw = pick(
    "attributes",
    "variant_details",
    "selected_variant",
    "selectedVariant",
    "variant",
    "variant_label",
    "variantLabel",
    "specifications"
  );

  if (variantIdRaw == null && (detailsRaw == null || detailsRaw === "")) {
    return null;
  }

  const out = {};

  if (detailsRaw != null && detailsRaw !== "") {
    if (typeof detailsRaw === "string") {
      const t = detailsRaw.trim();
      if (t) {
        if (
          (t.startsWith("{") && t.endsWith("}")) ||
          (t.startsWith("[") && t.endsWith("]"))
        ) {
          try {
            const parsed = JSON.parse(t);
            if (Array.isArray(parsed)) {
              out.selection = parsed;
            } else if (parsed && typeof parsed === "object") {
              Object.assign(out, parsed);
            } else {
              out.label = t;
            }
          } catch {
            out.label = t;
          }
        } else {
          out.label = t;
        }
      }
    } else if (typeof detailsRaw === "object") {
      Object.assign(out, detailsRaw);
    }
  }

  if (variantIdRaw != null && variantIdRaw !== "") {
    const n = Number(variantIdRaw);
    if (Number.isFinite(n)) out.product_variant_id = n;
  }

  return Object.keys(out).length ? JSON.stringify(out) : null;
}

// function gstBreakdownFromInclusiveTotal(totalInclusive, gstPercent) {
//   const total = Number(totalInclusive);
//   const rate = Number(gstPercent);
//   if (!Number.isFinite(total) || total < 0) {
//     return { taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0, gstRate: round2(rate || 0) };
//   }
//   if (!Number.isFinite(rate) || rate <= 0) {
//     return { taxable: round2(total), gst: 0, cgst: 0, sgst: 0, igst: 0, gstRate: 0 };
//   }
//   const taxable = total / (1 + rate / 100);
//   const gst = total - taxable;
//   const cgst = gst / 2;
//   const sgst = gst / 2;
//   return {
//     taxable: round2(taxable),
//     gst: round2(gst),
//     cgst: round2(cgst),
//     sgst: round2(sgst),
//     igst: 0,
//     gstRate: round2(rate)
//   };
// }

function gstBreakdownFromInclusiveTotal(
  totalInclusive,
  gstPercent,
  customerState
) {
  const total = Number(totalInclusive);
  const rate = Number(gstPercent);

  if (!Number.isFinite(total) || total < 0) {
    return {
      taxable: 0,
      gst: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      gstRate: 0,
    };
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      taxable: round2(total),
      gst: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      gstRate: 0,
    };
  }

  const taxable = total / (1 + rate / 100);
  const gst = total - taxable;

  const state = String(customerState || "")
    .trim()
    .toLowerCase();

  const isDelhi =
    state === "delhi" ||
    state === "new delhi" ||
    state === "nct of delhi";

  if (isDelhi) {
    return {
      taxable: round2(taxable),
      gst: round2(gst),
      cgst: round2(gst / 2),
      sgst: round2(gst / 2),
      igst: 0,
      gstRate: round2(rate),
    };
  }

  return {
    taxable: round2(taxable),
    gst: round2(gst),
    cgst: 0,
    sgst: 0,
    igst: round2(gst),
    gstRate: round2(rate),
  };
}

/* ================= CREATE PAYMENT ================= */

exports.createPayment = async (req, res) => {
  try {
    const b = req.body || {};
    const pick = (...keys) => {
      for (const k of keys) {
        if (b[k] != null && b[k] !== "") return b[k];
      }
      return null;
    };

    const {
      amount,
      firstname,
      phone,
      customer_name,
      address,
      city,
      state,
      postcode,
      gst_billing,
      firm_name,
      gst_number,
      productinfo,
      product_id,
      qty
    } = req.body;

    const normalizedEmail = String(pick("email") || "").trim();
    const normalizedPhone = String(pick("phone", "mobile") || "").trim();
    const normalizedAddress = String(pick("address", "billing_address") || "").trim();
    const normalizedCity = String(pick("city") || "").trim();
    const normalizedState = String(pick("state") || "").trim();
    const normalizedPostcode = String(pick("postcode", "pincode", "zip") || "").trim();
    const normalizedFirmName = String(
      pick("firm_name", "firmName", "gst_firm_name") || ""
    ).trim();
    const normalizedGstNumber = String(
      pick("gst_number", "gstNumber") || ""
    ).trim().toUpperCase();
    const normalizedGstBillingRaw = pick("gst_billing", "gstBilling");
    const normalizedGstBilling =
      normalizedGstBillingRaw == 1 ||
      normalizedGstBillingRaw === true ||
      normalizedGstBillingRaw === "1" ||
      normalizedGstBillingRaw === "true" ||
      normalizedGstBillingRaw === "on";
    const normalizedCustomerName = String(
      pick("customer_name", "customerName", "firstname") || ""
    ).trim();
    const addressIdRaw = pick("address_id", "addressId");
    const addressId = Number(addressIdRaw);
    const saveAddressRaw = pick("save_address", "saveAddress");
    const saveAddress =
      saveAddressRaw === true ||
      saveAddressRaw === 1 ||
      saveAddressRaw === "1" ||
      saveAddressRaw === "true";
    const userId = req.user?.id || null;

    let selectedAddress = null;
    if (userId && Number.isFinite(addressId) && addressId > 0) {
      selectedAddress = await UserAddress.findOne({
        where: { id: addressId, user_id: userId }
      });
      if (!selectedAddress) {
        return res.status(404).json({
          success: false,
          message: "Selected address not found"
        });
      }
    }

    const finalCustomerName = selectedAddress
      ? String(selectedAddress.full_name || selectedAddress.recipient_name || "").trim()
      : normalizedCustomerName || firstname;
    const finalPhone = selectedAddress
      ? String(selectedAddress.phone || "").trim()
      : normalizedPhone;
    const finalAddress = selectedAddress
      ? String(selectedAddress.address_line || "").trim()
      : normalizedAddress;
    const finalCity = selectedAddress
      ? String(selectedAddress.city || "").trim()
      : normalizedCity;
    const finalState = selectedAddress
      ? String(selectedAddress.state || "").trim()
      : normalizedState;
    const finalPostcode = selectedAddress
      ? String(selectedAddress.postcode || "").trim()
      : normalizedPostcode;

    const useCod =
      String(pick("payment_mode", "paymentMode") || "")
        .trim()
        .toLowerCase() === "cod";

    const payuEmail =
      normalizedEmail ||
      (normalizedPhone ? `${normalizedPhone}@customer.invalid` : "customer@example.com");

    // Required fields: amount, firstname, phone
    if (!amount || !firstname || !finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const normalizedQty = Number(qty || 1) || 1;
    let product = null;
    let category = null;
    let gstRate = 0;

    if (product_id) {
      product = await Product.findByPk(product_id, {
        include: [{ model: Category, attributes: ["id", "name", "tax_rate"] }]
      });
      category = product?.Category || null;
      const tr = category?.tax_rate != null ? Number(category.tax_rate) : 0;
      gstRate = Number.isFinite(tr) ? tr : 0;
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    // We store `rate` as taxable per-unit so invoice can show base + CGST/SGST.
    // const breakdown = gstBreakdownFromInclusiveTotal(amountNumber, gstRate);
    const breakdown = gstBreakdownFromInclusiveTotal(
          amountNumber,
          gstRate,
          finalState
        );
    
    const taxablePerUnit =
      normalizedQty > 0 ? breakdown.taxable / normalizedQty : breakdown.taxable;
    const mrpPerUnit =
      product?.old_price != null && product.old_price !== ""
        ? Number(product.old_price)
        : null;

    const txnid = "TXN" + Date.now();
    const orderId = "ORD" + Date.now();

    const variantAttributesJson = serializeOrderVariantSelection(b);

    /* SAVE ORDER */
    const createdOrder = await Order.create({
      order_id: orderId,
      txnid: txnid,

      customer_name: finalCustomerName,
      email: payuEmail || null,
      phone: finalPhone || null,
      address: finalAddress || null,
      city: finalCity || null,
      state: finalState || null,
      postcode: finalPostcode || null,
      gst_billing: normalizedGstBilling,
      firm_name: normalizedFirmName || null,
      gst_number: normalizedGstNumber || null,

      product_id: product_id || null,
      product_name: productinfo,

      qty: normalizedQty,

      attributes: variantAttributesJson,

      rate: round2(taxablePerUnit),
      mrp: mrpPerUnit != null && Number.isFinite(mrpPerUnit) ? round2(mrpPerUnit) : null,

      gst_rate: breakdown.gstRate,
      igst: breakdown.igst,
      cgst: breakdown.cgst,
      sgst: breakdown.sgst,

      payment_mode: useCod ? "COD" : "PayU",
       status: "pending",
       total_amount: round2(amountNumber),
    //   status: useCod ? "confirmed" : "pending"
    // status: "pending"
      
    });

    if (
      userId &&
      saveAddress &&
      !selectedAddress &&
      finalCustomerName &&
      finalPhone &&
      finalAddress &&
      finalCity &&
      finalState &&
      finalPostcode
    ) {
      await UserAddress.create({
        user_id: userId,
        label: String(pick("address_label", "addressLabel") || "Address").trim() || "Address",
        full_name: finalCustomerName,
        recipient_name: finalCustomerName,
        phone: finalPhone,
        address_line: finalAddress,
        city: finalCity,
        state: finalState,
        postcode: finalPostcode,
        is_default: false
      });
    }

    
    if (useCod) {
      return res.json({
        success: true,
        cod: true,
        order_id: orderId,
        txnid,
        message: "Order placed successfully (Cash on Delivery). Waiting for admin confirmation.",
        tax: {
          gst_percentage: breakdown.gstRate,
          taxable_amount: breakdown.taxable,
          cgst: breakdown.cgst,
          sgst: breakdown.sgst,
          igst: breakdown.igst,
          total_inclusive: round2(amountNumber)
        }
      });
    }

    /* CREATE HASH */
    const hashString =
      payu.key +
      "|" +
      txnid +
      "|" +
      amount +
      "|" +
      productinfo +
      "|" +
      firstname +
      "|" +
      payuEmail +
      "|||||||||||" +
      payu.salt;

    const hash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    res.json({
      success: true,
      key: payu.key,
      txnid,
      amount,
      firstname,
      email: payuEmail,
      phone,
      productinfo,
      hash,
      action: payu.baseUrl,
      tax: {
        gst_percentage: breakdown.gstRate,
        taxable_amount: breakdown.taxable,
        cgst: breakdown.cgst,
        sgst: breakdown.sgst,
        igst: breakdown.igst,
        total_inclusive: round2(amountNumber)
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Payment creation failed"
    });
  }
};

/* ================= VERIFY PAYMENT ================= */

exports.verifyPayment = async (req, res) => {
  try {
    const r = req.body || {};
    const txnid = String(r.txnid || "").trim();
    if (!txnid) {
      return res.status(400).json({
        success: false,
        message: "txnid is required",
      });
    }
    const order = await Order.findOne({ where: { txnid } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const currentStatus = String(order.status || "").trim().toLowerCase();
    const payuStatus = String(r.status || "").trim().toLowerCase();
    const unmapped = String(r.unmappedstatus || r.unmapped_status || "")
      .trim()
      .toLowerCase();
    const isSuccessStatus =
      payuStatus === "success" ||
      payuStatus === "captured" ||
      payuStatus === "paid" ||
      payuStatus === "completed";
    const isFailureStatus =
      ["failure", "failed", "cancelled", "canceled", "declined", "aborted"].includes(
        payuStatus,
      ) ||
      unmapped === "user cancelled" ||
      unmapped === "user_cancelled" ||
      unmapped === "failed" ||
      unmapped === "failure";
    if (isSuccessStatus) {

      // Admin manually confirmed karega.
      if (!["confirmed", "delivered", "shipped"].includes(currentStatus)) {
        await order.update({ status: "pending" });
      }
      return res.json({
        success: true,
        message: "Payment successful. Order kept pending for admin confirmation.",
        status: ["confirmed", "delivered", "shipped"].includes(currentStatus)
          ? order.status
          : "pending",
        txnid: order.txnid,
        order_id: order.order_id,
        id: order.id,
      });
    }
    if (isFailureStatus) {
      // Failed/cancelled payment DB me failed hoga.
      if (["confirmed", "delivered", "shipped"].includes(currentStatus)) {
        return res.json({
          success: true,
          message: "Order already processed; ignoring payment failure",
          status: order.status,
          txnid: order.txnid,
          order_id: order.order_id,
          id: order.id,
        });
      }
      await order.update({ status: "failed" });
      return res.json({
        success: false,
        message: "Payment failed",
        status: "failed",
        txnid: order.txnid,
        order_id: order.order_id,
        id: order.id,
      });
    }
    return res.json({
      success: currentStatus === "pending" || currentStatus === "confirmed",
      message: "Payment status inconclusive; keeping existing order status",
      status: order.status,
      txnid: order.txnid,
      order_id: order.order_id,
      id: order.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

