const NewsletterSubscription = require("../models/newsletterSubscriptionModel");
const User = require("../models/userModel");

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

exports.subscribe = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const bodyName = String(req.body?.name || "").trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    let resolvedName = bodyName || null;

    if (!resolvedName && req.user?.id) {
      const user = await User.findByPk(req.user.id, {
        attributes: ["name"],
      });
      resolvedName = String(user?.name || "").trim() || null;
    }

    const [record, created] = await NewsletterSubscription.findOrCreate({
      where: { email },
      defaults: { email, name: resolvedName },
    });

    if (!created) {
      if (!record.name && resolvedName) {
        await record.update({ name: resolvedName });
      }
      return res.json({
        success: true,
        message: "Email already subscribed",
        data: record,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully",
      data: record,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Subscription failed" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await NewsletterSubscription.findAll({
      order: [["id", "DESC"]],
    });

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
};
