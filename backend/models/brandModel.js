const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Brand = sequelize.define(
  "Brand",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: DataTypes.STRING,
    image: DataTypes.STRING
  },
  {
    tableName: "brands",
    timestamps: false
  }
);

module.exports = Brand;
