const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Banner = sequelize.define(
  "Banner",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    subtitle: {
      type: DataTypes.STRING,
      allowNull: true
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    background: {
      type: DataTypes.STRING,
      allowNull: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  
  {
    tableName: "banners",
    timestamps: false
  }
);

module.exports = Banner;