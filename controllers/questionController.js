import { Sequelize } from "sequelize";
import { Question } from "../models/question.js";

class QuestionController {
  async getPaginatedQuestions(req, res) {
    try {
      const { cursor, limit = 10 } = req.query;
      const { type, difficulty, marks } = req.body;
      const where = {};

      if (type) {
        where.type = type;
      }
      if (difficulty) {
        where.difficulty = difficulty;
      }
      if (marks) {
        where.marks = marks;
      }
      if (cursor) {
        where.updatedAt = { [Sequelize.Op.lt]: cursor };
      }

      const questions = await Question.findAll({
        where,
        order: [["updatedAt", "DESC"]],
        limit: parseInt(limit),
      });

      const hasNextPage = questions.length === parseInt(limit);
      const nextCursor = hasNextPage ? questions[questions.length - 1].updatedAt : null;

      res.status(200).send({
        success: true,
        questions,
        hasNextPage,
        nextCursor,
      });
    } catch (error) {
      console.error("Error in getPaginatedQuestions:", error);
      res
        .status(500)
        .send({ success: false, message: "Failed to fetch questions" });
    }
  }

  async upsertQuestion(req, res) {
    try {
      const { id, type, questionText, marks, options, difficulty, imageUrl } = req.body;

      if (!type || !questionText || marks === undefined || !difficulty) {
        return res.status(400).send({
          success: false,
          message:
            "Missing required fields: type, questionText, marks, and difficulty are required.",
        });
      }

      let question;

      if (id) {
        question = await Question.findByPk(id);
        if (!question) {
          return res.status(404).send({ success: false, message: "Question not found" });
        }
        question = await question.update({ type, questionText, marks, options, difficulty, imageUrl });
      } else {
        question = await Question.create({ type, questionText, marks, options, difficulty, imageUrl });
      }

      const output = { type, questionText, marks, options, difficulty, imageUrl };

      res.status(200).send({ success: true, question: output });
    } catch (error) {
      console.error("Error in upsertQuestion:", error);
      res.status(500).send({ success: false, message: "Failed to upsert question" });
    }
  }

  async deleteQuestion(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res
          .status(400)
          .send({ success: false, message: "Question id is required" });
      }

      const question = await Question.findByPk(id);
      if (!question) {
        return res.status(404).send({ success: false, message: "Question not found" });
      }

      await Question.destroy({ where: { id } });

      res.status(200).send({ success: true, message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error in deleteQuestion:", error);
      res.status(500).send({ success: false, message: "Failed to delete question" });
    }
  }
}

export const questionController = new QuestionController();