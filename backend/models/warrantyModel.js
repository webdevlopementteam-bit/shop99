const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Warranty = sequelize.define(
  "Warranty",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /** references orders.id (numeric PK) */
    order_pk: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /** denormalized from orders.order_id for display without a join */
    order_number: {
      type: DataTypes.STRING,
    },

    product_name: {
      type: DataTypes.STRING,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    invoice_url: {
      type: DataTypes.TEXT,
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "completed"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "warranty_registrations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Warranty;
