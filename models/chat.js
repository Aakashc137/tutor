import { Sequelize } from "sequelize";
import { sequelize } from "../connections/database.js";

export const Chat = sequelize.define(
  "Chat",
  {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
  },
  {
    tableName: "Chats",
    timestamps: true,
    indexes: [
      { fields: ["userId"] }, // Index on userId
      { fields: ["userId", "updatedAt"], order: [["updatedAt", "DESC"]] }, // Composite index for pagination
      { fields: ["updatedAt"], order: [["updatedAt", "DESC"]] }, // For sorting by updatedAt
    ],
  }
);
