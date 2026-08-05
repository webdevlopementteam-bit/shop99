const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = require("./userModel");
const Product = require("./productModel");

const Wishlist = sequelize.define(
  "Wishlist",
  {},
  { timestamps: true }
);

User.belongsToMany(Product, { through: Wishlist });
Product.belongsToMany(User, { through: Wishlist });

module.exports = Wishlist;