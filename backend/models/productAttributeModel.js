const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductAttribute = sequelize.define("ProductAttribute", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_value_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "product_attributes",
  timestamps: false
});


// 🔥 ADD THESE RELATIONS
const Product = require("./productModel");
const Attribute = require("./attributeModel");
const AttributeValue = require("./attributeValueModel");


ProductAttribute.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});

ProductAttribute.belongsTo(AttributeValue, {
  foreignKey: "attribute_value_id"
});

module.exports = ProductAttribute;