import { Chat } from '../models/chat.js';

class ChatController {
  async createChat(req, res) {
    try {
      const { title, userId } = req.body;
      if (!title || !userId) {
        return res.status(400).send({ success: false, message: 'Title and userId are required' });
      }

      const newChat = await Chat.create({ title, userId });
      res.status(201).send({ success: true, chat: newChat });
    } catch (error) {
      console.error(error);
      res.status(500).send({ success: false, message: 'Failed to create chat' });
    }
  }

  async getPaginatedChats(req, res) {
    try {
      const { userId, cursor, limit = 10 } = req.query;
      if (!userId) {
        return res.status(400).send({ success: false, message: 'userId is required' });
      }

      const where = { userId };
      if (cursor) {
        where.updatedAt = { $lt: cursor }; 
      }

      const chats = await Chat.findAll({
        where,
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit),
      });

      const nextCursor = chats.length > 0 ? chats[chats.length - 1].updatedAt : null;

      res.status(200).send({ success: true, chats, nextCursor });
    } catch (error) {
      console.error(error);
      res.status(500).send({ success: false, message: 'Failed to fetch chats' });
    }
  }
}

export const chatController = new ChatController();