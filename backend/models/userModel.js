// backend/models/userModel

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  name: DataTypes.STRING,

  phone: {
    type: DataTypes.STRING,
      allowNull: false
  },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
	
  password: DataTypes.STRING,

  role: {
    type: DataTypes.STRING,
    defaultValue: "user"
  }

}, {
  tableName: "users",
  timestamps: true
});

module.exports = User;
