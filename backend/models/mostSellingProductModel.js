const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Product = require("./productModel");

const MostSellingProduct = sequelize.define(
  "MostSellingProduct",
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
    tableName: "most_selling_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

MostSellingProduct.belongsTo(Product, { foreignKey: "product_id" });

module.exports = MostSellingProduct;
