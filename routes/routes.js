import express from 'express';
import authRouter from './authRoutes.js';
import { chatRouter } from './chatRoutes.js';
import { messageRouter } from './messageRoutes.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use('/auth', authRouter);

// Protected routes (authentication required)
router.use('/chat', verifyAccessToken, chatRouter);
router.use('/messages', verifyAccessToken, messageRouter);

export default router;