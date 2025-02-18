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
questionPaperRouter.post(
  "/generatePaperFromExtractedText",
  async (req, res) => {
    await questionPaperController.generateQuestionPaperFromExtractedText({ awsJobId: "0e01c8ed23834de1ecb6df197ac8efb24cca5450f0fcf9ab7de44522317a3647" });
    res.send("Generate paper from extracted text");
  }
);
questionPaperRouter.delete("/:id", questionPaperController.deleteQuestionPaper);
export { questionPaperRouter };
