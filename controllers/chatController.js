import { Sequelize } from "sequelize";
import { Chat } from "../models/chat.js";
import lodash from "lodash";
import { sequelize } from "../connections/database.js";

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
      const { userId, cursor, limit = 10, messages } = req.query;

      if (!userId) {
        return res
          .status(400)
          .send({ success: false, message: "userId is required" });
      }

      const where = { userId };
      if (cursor) {
        where.updatedAt = { [Sequelize.Op.lt]: cursor };
      }

      // Fetch paginated chats
      const chats = await Chat.findAll({
        where,
        order: [["updatedAt", "DESC"]],
        limit: parseInt(limit),
      });

      if (!chats.length) {
        return res.status(200).send({
          success: true,
          chats: [],
          hasNextPage: false,
          nextCursor: null,
        });
      }

      // Get all chat IDs
      const chatIds = chats.map((chat) => chat.id);

      let messagesByChatId = {};

      if (messages) {
        // Fetch messages only if `messages` is provided
        const allMessages = await sequelize.query(
          `
            SELECT *
            FROM (
              SELECT 
                "Messages".*,
                ROW_NUMBER() OVER (PARTITION BY "chatId" ORDER BY "id" DESC) AS "row_num"
              FROM "Messages"
              WHERE "chatId" IN (:chatIds)
            ) subquery
            WHERE row_num <= :messageLimit
            ORDER BY "chatId" ASC, "id" DESC;
            `,
          {
            replacements: {
              chatIds, // Array of chat IDs
              messageLimit: parseInt(messages) + 1, // Fetch extra message for `hasNextPage`
            },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        // Group messages by chatId using lodash
        messagesByChatId = lodash.groupBy(allMessages, "chatId");
      }

      // Add messages with pagination data to each chat
      const resultChats = chats.map((chat) => {
        const chatMessages = messagesByChatId[chat.id] || [];
        const hasNextPage = chatMessages.length > parseInt(messages || 0); // Default to 0 if messages not provided
        const resultMessages = hasNextPage
          ? chatMessages.slice(0, messages)
          : chatMessages;
        const nextCursor = hasNextPage
          ? resultMessages[resultMessages.length - 1]?.updatedAt
          : null;

        return {
          ...chat.toJSON(),
          messagePayload: messages
            ? {
                messages: resultMessages,
                hasNextPage,
                nextCursor,
              }
            : null,
        };
      });

      const hasNextPage = chats.length === parseInt(limit);
      const nextCursor = hasNextPage ? chats[chats.length - 1].updatedAt : null;

      res.status(200).send({
        success: true,
        chats: resultChats,
        hasNextPage,
        nextCursor,
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
