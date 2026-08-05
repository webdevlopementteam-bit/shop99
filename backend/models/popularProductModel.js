const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./productModel");

const PopularProduct = sequelize.define(
  "PopularProduct",
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
    tableName: "popular_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

PopularProduct.belongsTo(Product, { foreignKey: "product_id" });

module.exports = PopularProduct;