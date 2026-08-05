const { Product, Category, Brand } = require("../models/relations");

exports.getStats = async (req, res) => {
  try {
    const productCount = await Product.count();
    const categoryCount = await Category.count();
    const brandCount = await Brand.count();

    res.json({
      products: productCount,
      categories: categoryCount,
      orders: 0,      // replace later when orders added
      revenue: 0      // replace later when payments added
    });

  } catch (err) {
    res.status(500).json({ message: "Dashboard fetch failed" });
  }
};
