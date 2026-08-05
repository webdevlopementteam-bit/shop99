const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductVariantImage = sequelize.define("ProductVariantImage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  variant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  image: DataTypes.STRING,
}, {
  tableName: "product_variant_images",
  timestamps: false,
});

module.exports = ProductVariantImage;