import { Sequelize } from "sequelize";
import { sequelize } from "../connections/database.js";

export const Message = sequelize.define(
  "Message",
  {
    chatId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "Chats",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    role: {
      type: Sequelize.ENUM("USER", "ASSISTANT"),
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    mediaUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "Messages",
    timestamps: true,
    indexes: [{ fields: ["chatId"] }],
  }
);
