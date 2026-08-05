// controllers/otpController.js

const OTP = require("../models/otpModel");
const User = require("../models/userModel"); // ensure this exists
const jwt = require("jsonwebtoken");

function buildDltVariables(otp) {
  const fmt = process.env.FAST2SMS_OTP_VARIABLES_FORMAT;
  if (fmt && fmt.includes("{otp}")) {
    return fmt.replace(/\{otp\}/g, otp);
  }
  return otp;
}

/** Exact approved template from DLT (use {#VAR#} or {#var#} as placeholder). */
function buildDltManualMessage(otp) {
  const tpl =
    process.env.FAST2SMS_OTP_MESSAGE_TEXT?.trim() ||
    "Your One Time Password(OTP) is {#VAR#} PRAKASH ELECTRONICS (INDIA)";
  return tpl.replace(/\{#VAR#\}/gi, otp).replace(/\{#var#\}/gi, otp);
}

function normalizeIndianMobile(phone) {
  const d = String(phone).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length >= 10) return d.slice(-10);
  return d;
}

// 10 digit no
function formatNumbersForFast2SMS(digits10) {
  if (process.env.FAST2SMS_NUMBERS_WITH_91 === "1") {
    return `91${digits10}`;
  }
  return digits10;
}

async function fetchDeliveryReport(requestId) {
  if (!requestId || !process.env.FAST2SMS_API_KEY) return null;
  const key = process.env.FAST2SMS_API_KEY;
  const path = `https://www.fast2sms.com/dev/dlr/${encodeURIComponent(requestId)}`;
  let r = await fetch(path, { headers: { authorization: key } });
  if (!r.ok) {
    const q = `${path}?authorization=${encodeURIComponent(key)}`;
    r = await fetch(q);
  }
  return r.json();
}

// 🔹 SEND OTP
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const numbers = normalizeIndianMobile(phone);
    if (numbers.length !== 10) {
      return res.status(400).json({ message: "Invalid Indian mobile number" });
    }

    // ✅ Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Expiry (5 min)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // ✅ Delete old OTP
    await OTP.destroy({ where: { phone } });

    // ✅ Save new OTP
    await OTP.create({
      phone,
      otp,
      expires_at: expiresAt
    });

    // TRAI template id (Jio) — dlt_manual body.template_id; NOT the same as Fast2SMS "Message ID" for route=dlt
    const templateId = process.env.FAST2SMS_DLT_TEMPLATE_ID?.trim();
    /** Fast2SMS DLT Manager → Content Template row → Message ID (API field `message`). Never use TRAI id here. */
    const f2sMessageId = process.env.FAST2SMS_F2S_MESSAGE_ID?.trim();
    const entityId = process.env.FAST2SMS_ENTITY_ID?.trim();
    const senderId = process.env.FAST2SMS_SENDER_ID?.trim();
    /** dlt = operator finds template via Fast2SMS Message ID (fixes TEMPLATE_NOT_FOUND vs dlt_manual+TRAI). */
    const smsRoute = (
      process.env.FAST2SMS_SMS_ROUTE || "dlt_manual"
    ).toLowerCase();

    if (!templateId || !entityId || !senderId) {
      console.error(
        "OTP SMS: missing env FAST2SMS_DLT_TEMPLATE_ID / FAST2SMS_ENTITY_ID / FAST2SMS_SENDER_ID"
      );
      return res.status(503).json({
        success: false,
        message: "SMS not configured",
        missing: {
          FAST2SMS_DLT_TEMPLATE_ID: !templateId,
          FAST2SMS_ENTITY_ID: !entityId,
          FAST2SMS_SENDER_ID: !senderId
        },
        hint:
          "Set TRAI Content Template ID (Jio), Principal Entity ID, Sender ID. For route=dlt also set FAST2SMS_F2S_MESSAGE_ID from Fast2SMS DLT Manager."
      });
    }

    if (smsRoute === "dlt" && !f2sMessageId) {
      return res.status(503).json({
        success: false,
        message: "FAST2SMS_F2S_MESSAGE_ID required for route=dlt",
        hint:
          "Delivery TEMPLATE_NOT_FOUND with dlt_manual: switch to FAST2SMS_SMS_ROUTE=dlt and set FAST2SMS_F2S_MESSAGE_ID to the Message ID from Fast2SMS → DLT Manager → Content Template (not Jio TRAI template id)."
      });
    }

    let payload;
    if (smsRoute === "dlt") {
      const variablesValues = buildDltVariables(otp);
      payload = {
        route: "dlt",
        sender_id: senderId,
        message: f2sMessageId,
        variables_values: variablesValues,
        numbers: formatNumbersForFast2SMS(numbers),
        entity_id: entityId,
        flash: "0"
      };
    } else {
      const manualMsg = buildDltManualMessage(otp);
      if (/\{#\s*var\s*#\}/i.test(manualMsg)) {
        return res.status(500).json({
          success: false,
          message:
            "OTP SMS template mismatch: placeholder not replaced. Fix FAST2SMS_OTP_MESSAGE_TEXT to match DLT approval exactly."
        });
      }
      payload = {
        route: "dlt_manual",
        sender_id: senderId,
        message: manualMsg,
        numbers: formatNumbersForFast2SMS(numbers),
        entity_id: entityId,
        template_id: templateId,
        flash: "0"
      };
    }

    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    console.log("SMS Response:", data);

    if (!data.return) {
      const hint =
        data?.status_code === 424
          ? "424: If FAST2SMS_SMS_ROUTE=dlt, `message` must be Fast2SMS DLT Manager Message ID (not TRAI). Use FAST2SMS_SMS_ROUTE=dlt_manual (default) with TRAI template_id + FAST2SMS_OTP_MESSAGE_TEXT matching approved text. Or copy exact Message ID from Fast2SMS Content Template row."
          : undefined;
      return res.status(500).json({
        success: false,
        message: "SMS failed",
        error: data,
        ...(hint && { hint })
      });
    }

    const requestId = data.request_id ?? data.requestId;

    let dlr = null;
    const awaitDlrMs = parseInt(
      process.env.FAST2SMS_AWAIT_DLR_MS || "0",
      10
    );
    if (requestId && awaitDlrMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(awaitDlrMs, 8000)));
      try {
        dlr = await fetchDeliveryReport(requestId);
        console.log(
          "SMS DLR (after await):\n" + JSON.stringify(dlr, null, 2)
        );
      } catch (e) {
        console.error("SMS DLR fetch failed:", e);
      }
    } else if (requestId) {
      setTimeout(() => {
        fetchDeliveryReport(requestId)
          .then((d) =>
            console.log(
              "SMS DLR (async):\n" + JSON.stringify(d, null, 2)
            )
          )
          .catch((e) => console.error("SMS DLR async:", e));
      }, 2500);
    }

    return res.json({
      success: true,
      message: "OTP sent successfully",
      request_id: requestId,
      ...(dlr && { delivery_report: dlr }),
      note:
        "Fast2SMS accepted the request; delivery is separate. Use request_id in Fast2SMS → Delivery Reports / Transactions. If SMS never arrives: set FAST2SMS_AWAIT_DLR_MS=4000 in .env to see carrier status in this response; try FAST2SMS_NUMBERS_WITH_91=1; confirm template text matches Jio exactly; check spam/DND."
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
};


// 🔹 VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp, name, email } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "Phone & OTP required"
      });
    }

    const record = await OTP.findOne({ where: { phone } });

    if (!record) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (new Date() > record.expires_at) {
      await OTP.destroy({ where: { phone } });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ OTP verified → delete
    await OTP.destroy({ where: { phone } });

    // 🔥 CHECK USER EXIST
    let user = await User.findOne({ where: { phone } });
      const isNewUser = !user;

    if (!user) {
    user = await User.create({
      phone,
      name: name || "User",
      email: email || null
    });
  } else {
    // 🔥 UPDATE EXISTING USER
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
  }

    // 🔐 TOKEN
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
      role: user.role || null,
      isNewUser
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed"
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};