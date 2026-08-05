const Banner = require("../models/bannerModel");
const Product = require("../models/productModel");

const getUploadedFileName = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0].filename;
  }

  if (req.file && req.file.fieldname === fieldName) {
    return req.file.filename;
  }

  return null;
};

// ================= GET ALL =================
exports.getAll = async (req, res) => {
  try {

    const banners = await Banner.findAll({
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "slug"]
        }
      ],
      order: [["id", "DESC"]]
    });

    res.json(banners);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};


// ================= CREATE =================
exports.create = async (req, res) => {
  try {

    const { title, subtitle, product_id } = req.body;

    const image = getUploadedFileName(req, "image");
    const background = getUploadedFileName(req, "background");

    await Banner.create({
      title,
      subtitle,
      image,
      background,
      product_id: product_id || null
    });

    res.json({
      message: "Banner Created"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};


// ================= UPDATE =================
exports.update = async (req, res) => {
  try {

    const { title, subtitle, product_id } = req.body;

    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({ error: "Banner not found" });
    }

    const image = getUploadedFileName(req, "image") || banner.image;
    const background = getUploadedFileName(req, "background") || banner.background;

    await Banner.update(
      {
        title,
        subtitle,
        image,
        background,
        product_id: product_id || null
      },
      {
        where: { id: req.params.id }
      }
    );

    res.json({
      message: "Banner Updated"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};


// ================= DELETE =================
exports.remove = async (req, res) => {
  try {

    const banner = await Banner.findByPk(req.params.id);

    if (!banner) {
      return res.status(404).json({ error: "Banner not found" });
    }

    await banner.destroy();

    res.json({
      message: "Banner Deleted"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
};