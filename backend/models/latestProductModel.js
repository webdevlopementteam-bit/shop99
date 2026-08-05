const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./productModel");

const LatestProduct = sequelize.define(
  "LatestProduct",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "latest_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

LatestProduct.belongsTo(Product, { foreignKey: "product_id" });

module.exports = LatestProduct;
