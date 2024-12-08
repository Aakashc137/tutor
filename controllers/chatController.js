import { Sequelize } from "sequelize";
import { Chat } from "../models/chat.js";

class ChatController {
  async createChat(req, res) {
    try {
      const { title, userId } = req.body;
      if (!title || !userId) {
        return res
          .status(400)
          .send({ success: false, message: "Title and userId are required" });
      }

      const newChat = await Chat.create({ title, userId });
      res.status(201).send({ success: true, chat: newChat });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to create chat" });
    }
  }

  async getPaginatedChats(req, res) {
    try {
      const { userId, cursor, limit = 10 } = req.query;
      if (!userId) {
        return res
          .status(400)
          .send({ success: false, message: "userId is required" });
      }

      const where = { userId };
      if (cursor) {
        where.updatedAt = { [Sequelize.Op.lt]: cursor };
      }

      const chats = await Chat.findAll({
        where,
        order: [["updatedAt", "DESC"]],
        limit: parseInt(limit) + 1,
      });

      const hasNextPage = chats.length > limit;

      const resultChats = hasNextPage ? chats.slice(0, limit) : chats;

      const nextCursor =
        resultChats.length > 0
          ? resultChats[resultChats.length - 1].updatedAt
          : null;

      res.status(200).send({
        success: true,
        chats: resultChats,
        hasNextPage,
        nextCursor: hasNextPage ? nextCursor : null,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to fetch chats" });
    }
  }
}

export const chatController = new ChatController();
