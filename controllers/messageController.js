import { Message } from '../models/message.js';

class MessageController {
  async createMessages(req, res) {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).send({ success: false, message: 'Messages must be a non-empty array' });
      }

      const createdMessages = await Message.bulkCreate(messages);
      res.status(201).send({ success: true, messages: createdMessages });
    } catch (error) {
      console.error(error);
      res.status(500).send({ success: false, message: 'Failed to create messages' });
    }
  }

  async getPaginatedMessages(req, res) {
    try {
      const { chatId, cursor, limit = 10 } = req.query;

      if (!chatId) {
        return res.status(400).send({ success: false, message: 'chatId is required' });
      }

      const where = { chatId };
      if (cursor) {
        where.updatedAt = { $lt: cursor };
      }

      const messages = await Message.findAll({
        where,
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit),
      });

      const nextCursor = messages.length > 0 ? messages[messages.length - 1].updatedAt : null;

      res.status(200).send({ success: true, messages, nextCursor });
    } catch (error) {
      console.error(error);
      res.status(500).send({ success: false, message: 'Failed to fetch messages' });
    }
  }
}

export const messageController = new MessageController();