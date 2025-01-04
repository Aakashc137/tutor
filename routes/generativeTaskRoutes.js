import express from 'express';
import {generativeTaskController} from '../controllers/generativeTaskController.js';

const generativeTaskRouter = express.Router();

generativeTaskRouter.post('/generateQuestionPaper',generativeTaskController.generateQuestionPaper);

export  { generativeTaskRouter } ;
