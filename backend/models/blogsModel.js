const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Blogs = sequelize.define(
  "Blogs",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    benefits: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    why_choose_us: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    conclusion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    faq: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "blogs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

module.exports = Blogs;
