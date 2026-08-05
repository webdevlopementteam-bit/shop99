// models/categoryAttributeMapModel.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CategoryAttributeMap = sequelize.define("CategoryAttributeMap", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
   is_extra: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: "category_attribute_maps",
  timestamps: false
});

module.exports = CategoryAttributeMap;