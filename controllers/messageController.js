import { Sequelize } from "sequelize";
import { Message } from "../models/message.js";

class MessageController {
  async createMessages(req, res) {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).send({
          success: false,
          message: "Messages must be a non-empty array",
        });
      }

      const createdMessages = await Message.bulkCreate(messages, {
        individualHooks: true,
      });

      res.status(201).send({ success: true, messages: createdMessages });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to create messages" });
    }
  }

  async getPaginatedMessages(req, res) {
    try {
      const { chatId, cursor, limit = 10 } = req.query;

      if (!chatId) {
        return res
          .status(400)
          .send({ success: false, message: "chatId is required" });
      }

      const where = { chatId };
      if (cursor) {
        where.id = { [Sequelize.Op.lt]: cursor };
      }

      const messages = await Message.findAll({
        where,
        order: [["id", "DESC"]],
        limit: parseInt(limit) + 1,
      });

      const hasNextPage = messages.length > limit;
      const resultMessages = hasNextPage ? messages.slice(0, limit) : messages;
      const nextCursor =
        resultMessages.length > 0
          ? resultMessages[resultMessages.length - 1].id
          : null;

      res.status(200).send({
        success: true,
        messages: resultMessages,
        hasNextPage,
        nextCursor,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ success: false, message: "Failed to fetch messages" });
    }
  }
}

export const messageController = new MessageController();
