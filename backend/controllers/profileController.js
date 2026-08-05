const { Op } = require("sequelize");
const User = require("../models/userModel");

// ================= GET PROFILE =================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "phone", "email", "city", "image", "role"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.log("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, city } = req.body;

    // Only logged-in user's profile updates
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id },
        },
      });

      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.city = city ?? user.city;

    // Phone not updated, because login phone should stay same
    // user.phone = user.phone;

    // Image changes only if new image uploaded
    if (req.file) {
      user.image = req.file.filename;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        city: user.city,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Update failed" });
  }
};
