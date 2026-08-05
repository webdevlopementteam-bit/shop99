const Wishlist = require("../models/Wishlist");
const Product = require("../models/productModel");

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    await Wishlist.create({
      UserId: userId,
      ProductId: productId,
    });

    res.json({ message: "Added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Error adding to wishlist" });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    console.log("REQ USER:", req.user);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    const items = await Wishlist.findAll({
      where: { UserId: userId },
      include: [{
        model: Product
      }]
    });

    res.json(items);

  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    await Wishlist.destroy({
      where: { UserId: userId, ProductId: productId },
    });

    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Error removing" });
  }
};