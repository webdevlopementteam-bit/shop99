const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Attribute = sequelize.define("Attribute", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: "attributes",
  timestamps: false
});

module.exports = Attribute;