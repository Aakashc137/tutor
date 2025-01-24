import express from "express";
import { questionPaperController } from "../controllers/paperController.js";

const questionPaperRouter = express.Router();

questionPaperRouter.post(
  "/generate",
  questionPaperController.generateQuestionPaper
);
questionPaperRouter.post(
  "/getPaginatedQuestionPapers",
  questionPaperController.getPaginatedQuestionPapers
);
questionPaperRouter.delete("/:id", questionPaperController.deleteQuestionPaper);
export { questionPaperRouter };
