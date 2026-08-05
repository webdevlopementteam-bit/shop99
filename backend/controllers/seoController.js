const SEO = require("../models/seoModel");
const { Op } = require("sequelize");

const fs = require("fs");
const path = require("path");

/* ================= GET ALL SEO ================= */
exports.getSEO = async (req, res) => {
  try {
    const seoList = await SEO.findAll({
      order: [["id", "DESC"]],
    });

    res.json(seoList);

  } catch (err) {
    console.error("GET SEO ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= GET BY PAGE ================= */
exports.getSEOByPage = async (req, res) => {
  try {
    const { page } = req.params;

    const seo = await SEO.findOne({
      where: {
        page_name: page,
        is_active: true,
      },
    });

    if (!seo) {
      return res.status(404).json({
        message: "SEO not found",
      });
    }

    res.json(seo);

  } catch (err) {
    console.error("GET SEO BY PAGE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


/* ================= CREATE ================= */
exports.createSEO = async (req, res) => {
  try {
    const { page_name } = req.body;

    const existing = await SEO.findOne({
      where: { page_name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "SEO already exists for this page_name"
      });
    }

    // 🔥 FIX: convert status
    const is_active =
        req.body.is_active === "inactive" ? "inactive" : "active";

    const data = await SEO.create({
      ...req.body,
      is_active,
      og_image: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: "SEO created successfully",
      data
    });

  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "page_name must be unique"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ================= UPDATE ================= */

exports.updateSEO = async (req, res) => {
  try {
    const { id } = req.params;
    const { page_name } = req.body;

    const seo = await SEO.findByPk(id);

    if (!seo) {
      return res.status(404).json({
        success: false,
        message: "SEO not found"
      });
    }

    if (page_name) {
      const existing = await SEO.findOne({
        where: {
          page_name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "page_name already exists"
        });
      }
    }

    const updatedData = {
      ...req.body
    };

    // 🔥 FIX: convert status
    if (req.body.is_active !== undefined) {
      updatedData.is_active =
        req.body.is_active === "inactive" ? "inactive" : "active";
    }

    if (req.file) {
      updatedData.og_image = req.file.filename;

      if (seo.og_image) {
        const oldPath = path.join(__dirname, "../uploads", seo.og_image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await seo.update(updatedData);

    res.json({
      success: true,
      message: "SEO updated successfully",
      data: seo
    });

  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "page_name must be unique"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/* ================= DELETE ================= */
exports.deleteSEO = async (req, res) => {
  try {
    const { id } = req.params;

    const seo = await SEO.findByPk(id);

    if (!seo) {
      return res.status(404).json({
        message: "SEO not found",
      });
    }

    await seo.destroy();

    res.json({
      message: "SEO deleted successfully",
    });

  } catch (error) {
    console.error("DELETE SEO ERROR:", error);
    res.status(500).json({
      message: "Server Error",
    });
  }
};


/* ================= TOGGLE STATUS ================= */
exports.toggleStatus = async (req, res) => {
  try {
    const seo = await SEO.findByPk(req.params.id);

    if (!seo) {
      return res.status(404).json({
        message: "SEO not found",
      });
    }

    seo.is_active = !seo.is_active;
    await seo.save();

    res.json({
      message: "Status updated",
      data: seo,
    });

  } catch (err) {
    console.error("TOGGLE SEO ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.saveSEO = async (req, res) => {
  try {
    const { page_name } = req.body;

    let seo = await SEO.findOne({ where: { page_name } });

    if (seo) {
      await seo.update(req.body);
      return res.json({ message: "SEO Updated", data: seo });
    } else {
      seo = await SEO.create(req.body);
      return res.json({ message: "SEO Created", data: seo });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};