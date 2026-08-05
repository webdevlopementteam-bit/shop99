// backend/controllers/brandController.js

const Brand = require("../models/brandModel");


exports.getAll = async (req, res) => {
  try {
    const data = await Brand.findAll({
      order: [["id", "DESC"]],
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch brands" });
  }
};


exports.create = async (req, res) => {
  try {
    await Brand.create({
      name: req.body.name,
      image: req.file ? req.file.filename : null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Brand create failed" });
  }
};

exports.update = async (req, res) => {
  try {
    const data = {
      name: req.body.name,
    };

    if (req.file) {
      data.image = req.file.filename;
    }

    await Brand.update(data, {
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Brand update failed" });
  }
};

exports.remove = async (req, res) => {
  try {
    await Brand.destroy({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Brand delete failed" });
  }
};
