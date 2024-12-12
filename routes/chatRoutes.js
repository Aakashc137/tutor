import express from 'express';
import { chatController } from '../controllers/chatController.js';

const chatRouter = express.Router();

chatRouter.post('/create', chatController.createChat);
chatRouter.get('/getPaginatedChats', chatController.getPaginatedChats);
chatRouter.post('/deleteChats', chatController.deleteChats);

export { chatRouter };