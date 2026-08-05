const Footer = require("../models/footerModel");
const fs = require("fs");
const path = require("path");

/* ================= HELPER ================= */
const safeParse = (data) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return [];
  }
};

const cleanColumns = (columns) => {
  return (columns || [])
    .map((col) => ({
      title: col.title,
      links: (col.links || []).filter(
        (link) => link.name && link.path
      ),
    }))
    .filter((col) => col.title && col.links.length > 0);
};

/* ================= GET ================= */
exports.getFooter = async (req, res) => {
  try {
    const footer = await Footer.findOne({
      where: { is_active: true },
      order: [["id", "DESC"]],
    });

    if (!footer) return res.status(404).json({ message: "Not found" });

    res.json({
      ...footer.toJSON(),
      columns: safeParse(footer.columns),
      contact: safeParse(footer.contact),
      socials: safeParse(footer.socials),
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= CREATE ================= */
exports.createFooter = async (req, res) => {
  try {
    const { columns, contact, socials, description, copyright } = req.body;

    // 🔥 handle logo upload
    let logo = null;
    if (req.file) {
      logo = req.file.filename;
    }

    // only one active
    await Footer.update({ is_active: false }, { where: {} });

    const footer = await Footer.create({
      columns: JSON.stringify(columns || []),
      contact: JSON.stringify(contact || {}),
      socials: JSON.stringify(socials || {}),
      description,
      logo, // ✅ filename save
      copyright,
      is_active: true,
    });

    res.json({ success: true, data: footer });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= UPDATE ================= */
exports.updateFooter = async (req, res) => {
  try {
    const footer = await Footer.findByPk(req.params.id);
    if (!footer) return res.status(404).json({ message: "Not found" });

    const { columns, contact, socials, description, copyright } = req.body;

    let logo = footer.logo;

    // 🔥 new logo upload
    if (req.file) {
      logo = req.file.filename;

      // 🗑 delete old logo
      if (footer.logo) {
        const oldPath = path.join(__dirname, "../uploads", footer.logo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await footer.update({
      columns: JSON.stringify(columns || safeParse(footer.columns)),
      contact: JSON.stringify(contact || safeParse(footer.contact)),
      socials: JSON.stringify(socials || safeParse(footer.socials)),
      description: description ?? footer.description,
      logo, // ✅ updated
      copyright: copyright ?? footer.copyright,
    });

    res.json({ success: true, data: footer });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE ================= */

exports.deleteFooter = async (req, res) => {
  try {
    const footer = await Footer.findByPk(req.params.id);
    if (!footer) return res.status(404).json({ message: "Not found" });

    // 🗑 delete logo file also
    if (footer.logo) {
      const filePath = path.join(__dirname, "../uploads", footer.logo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await footer.destroy();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};