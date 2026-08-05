const UserAddress = require("../models/userAddressModel");
const { Op } = require("sequelize");

function pickAddressPayload(body = {}) {
  const fullName = String(body.full_name || body.fullName || "").trim();
  const recipientName = String(body.recipient_name || body.recipientName || "").trim();
  const resolvedName = fullName || recipientName;

  return {
    label: String(body.label || "Home").trim() || "Home",
    full_name: resolvedName,
    recipient_name: resolvedName,
    phone: String(body.phone || "").trim(),
    address_line: String(body.address_line || body.address || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    postcode: String(body.postcode || body.pincode || "").trim(),
    is_default:
      body.is_default === true ||
      body.is_default === 1 ||
      body.is_default === "1" ||
      body.is_default === "true",
  };
}

function hasRequiredAddressFields(payload) {
  return Boolean(
    payload.full_name &&
      payload.recipient_name &&
      payload.phone &&
      payload.address_line &&
      payload.city &&
      payload.state &&
      payload.postcode
  );
}

async function clearOtherDefaults(userId, keepAddressId = null) {
  const where = { user_id: userId, is_default: true };
  if (keepAddressId) {
    where.id = { [Op.ne]: keepAddressId };
  }
  await UserAddress.update({ is_default: false }, { where });
}

exports.getMyAddresses = async (req, res) => {
  try {
    const rows = await UserAddress.findAll({
      where: { user_id: req.user.id },
      order: [
        ["is_default", "DESC"],
        ["updated_at", "DESC"],
      ],
    });
    return res.json({ addresses: rows });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const payload = pickAddressPayload(req.body);
    if (!hasRequiredAddressFields(payload)) {
      return res.status(400).json({ message: "All address fields are required" });
    }

    const existingCount = await UserAddress.count({ where: { user_id: req.user.id } });
    const shouldDefault = payload.is_default || existingCount === 0;

    const address = await UserAddress.create({
      user_id: req.user.id,
      ...payload,
      is_default: shouldDefault,
    });

    if (shouldDefault) {
      await clearOtherDefaults(req.user.id, address.id);
    }

    return res.status(201).json({ success: true, address });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save address" });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const address = await UserAddress.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const payload = pickAddressPayload(req.body);
    if (!hasRequiredAddressFields(payload)) {
      return res.status(400).json({ message: "All address fields are required" });
    }

    await address.update(payload);
    if (payload.is_default) {
      await clearOtherDefaults(req.user.id, address.id);
    }

    return res.json({ success: true, address });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update address" });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await UserAddress.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = Boolean(address.is_default);
    await address.destroy();

    if (wasDefault) {
      const latest = await UserAddress.findOne({
        where: { user_id: req.user.id },
        order: [["updated_at", "DESC"]],
      });
      if (latest) await latest.update({ is_default: true });
    }

    return res.json({ success: true, message: "Address deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete address" });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const address = await UserAddress.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await clearOtherDefaults(req.user.id, address.id);
    await address.update({ is_default: true });

    return res.json({ success: true, address });
  } catch (error) {
    return res.status(500).json({ message: "Failed to set default address" });
  }
};
