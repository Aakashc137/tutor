import express from 'express';
import authRouter from './authRoutes.js';
import { chatRouter } from './chatRoutes.js';
import { messageRouter } from './messageRoutes.js';
import { extractRouter } from './extractRoutes.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';
import { userRouter } from './userRoutes.js';
import { blueprintRouter } from './blueprintRoutes.js';
import { questionPaperRouter } from './questionPaperRoutes.js';
import { questionRouter } from './questionRoutes.js';

const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
    res.status(200).send({ status: 'healthy' });
});

router.use('/auth', authRouter);

// Protected routes (authentication required)
router.use('/chat', verifyAccessToken, chatRouter);
router.use('/message', verifyAccessToken, messageRouter);
router.use('/user', verifyAccessToken, userRouter);
router.use('/extract', verifyAccessToken, extractRouter);
router.use('/blueprint', verifyAccessToken, blueprintRouter);
router.use('/questionPaper', verifyAccessToken, questionPaperRouter);
router.use('/question', verifyAccessToken, questionRouter);

export default router;
