const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel");

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

/** POST body: name?, phone, password */
exports.registerAdmin = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const existing = await Admin.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ message: "Admin with this phone already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name: name || null,
      phone,
      password: hashed,
      role: "admin",
    });

    const token = generateToken(admin.id, "admin");

    res.json({
      message: "Admin registered successfully",
      token,
      role: "admin",
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST body: phone, password */
exports.loginAdmin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const admin = await Admin.findOne({ where: { phone } });
    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    if (!admin.password) {
      return res.status(400).json({ message: "Password not set for this account" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = generateToken(admin.id, "admin");

    res.json({
      message: "Admin login successful",
      token,
      role: "admin",
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
        can_delete_users: admin.can_delete_users,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** GET — Bearer admin JWT */
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: ["id", "name", "phone", "role", "can_delete_users"],
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT body: name?, phone?, newPassword?
 * — Bearer admin JWT. `newPassword` optional; if sent, sets password (no current password check).
 */
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, phone, newPassword } = req.body;

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const np = newPassword != null ? String(newPassword) : "";
    const wantsPassword = np.trim() !== "";

    if (wantsPassword) {
      if (np.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      admin.password = await bcrypt.hash(np, 10);
    }

    if (phone !== undefined) {
      const p = String(phone).trim();
      if (!p) {
        return res.status(400).json({ message: "Phone is required" });
      }
      if (p !== admin.phone) {
        const taken = await Admin.findOne({ where: { phone: p } });
        if (taken && taken.id !== admin.id) {
          return res.status(400).json({ message: "Phone already in use" });
        }
      }
      admin.phone = p;
    }

    if (name !== undefined) {
      const n =
        name === null || String(name).trim() === "" ? null : String(name).trim();
      admin.name = n;
    }

    await admin.save();

    res.json({
      message: wantsPassword ? "Account and password updated." : "Account details saved.",
      id: admin.id,
      name: admin.name,
      phone: admin.phone,
      role: admin.role,
      can_delete_users: admin.can_delete_users,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** PATCH body: newPassword — Bearer admin JWT (no current password) */
exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const adminId = req.user?.id;

    if (!newPassword || String(newPassword).trim() === "") {
      return res.status(400).json({ message: "newPassword is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
