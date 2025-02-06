import express from 'express';
import { questionController } from '../controllers/questionController.js';

const questionRouter = express.Router();

questionRouter.post('/upsert', questionController.upsertQuestion);
questionRouter.post('/getPaginatedQuestions', questionController.getPaginatedQuestions);
questionRouter.delete('/delete', questionController.deleteQuestion);

export { questionRouter };