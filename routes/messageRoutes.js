import express from 'express';
import { messageController } from '../controllers/messageController.js';

const messageRouter = express.Router();

messageRouter.post('/create', messageController.createMessages);
messageRouter.get('/getPaginatedMessages', messageController.getPaginatedMessages);

export { messageRouter };