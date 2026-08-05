const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductAttributeMap = sequelize.define(
  "ProductAttributeMap",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attribute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "product_attribute_maps",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["product_id", "attribute_id"],
      },
    ],
  }
);

module.exports = ProductAttributeMap;
