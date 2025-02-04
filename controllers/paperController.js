import OpenAI from "openai";
import prompts from "../generativeTask/utils/prompts.json" assert { type: "json" };
import {
  structureQuestionPaper,
  structureSolution,
  getOpenAIMessages,
  generateHTML,
  getResponseFormat,
  uploadToS3,
  createQuestionPaperSets,
} from "../utils/generateQuestionPaper.util.js";
import { QuestionPaper } from "../models/questionPaper.js";
import lodash from "lodash";
import { Op } from "sequelize";
import {
  sendMessageOfCompletion,
  sendMessageOfFailure,
} from "./questionController.js";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRY_COUNT = 4;

class QuestionPaperController {
  async generateQuestionPaper(req, res) {
    try {
      const {
        name,
        blueprint,
        grade,
        subject,
        totalMarks,
        numberOfSets = 1,
        academyName,
        timeDuration,
      } = req.body;

      // Validate Input
      const requiredFields = [
        { field: blueprint, message: "blueprint is required in req.body" },
        { field: name, message: "name is required in req.body" },
        { field: grade, message: "grade is required in req.body" },
        { field: subject, message: "subject is required in req.body" },
        { field: academyName, message: "academyName is required in req.body" },
        {
          field: timeDuration,
          message: "timeDuration is required in req.body",
        },
      ];
      for (const { field, message } of requiredFields) {
        if (!field) {
          return res.status(400).json({ error: message });
        }
      }
      const blueprintQuestionIds = blueprint.map(
        (question) => question.questionId
      );
      if (
        blueprintQuestionIds.length !==
          lodash.uniq(blueprintQuestionIds).length ||
        blueprintQuestionIds.length !== blueprint.length
      ) {
        return res.status(400).json({
          error:
            "questionId not found in blueprint OR duplicate questionIds found in blueprint",
        });
      }

      // Create a new QuestionPaper entry with status 'inProgress'
      const generatedPaper = await QuestionPaper.create({
        name,
        grade,
        topics: lodash.uniq(blueprint.map((question) => question.topic)),
        subject,
        status: "inProgress",
      });

      res.status(200).json({
        message: "Question paper generation started",
        questionPaper: generatedPaper,
      });

      const responseFormat = getResponseFormat();

      let retryCount = 0;
      let questionPaper = [];
      let leftoverBlueprint = blueprint; // blueprint for leftover questions to be generated. Will be all questions for the first try

      while (retryCount < MAX_RETRY_COUNT) {
        let messages = getOpenAIMessages(leftoverBlueprint, prompts);
        const response = await openai.beta.chat.completions.parse({
          model: "gpt-4o",
          messages,
          response_format: responseFormat,
        });

        const result = response.choices[0].message.parsed;
        const generatedQuestionPaper = result.answer ?? [];
        questionPaper = [...questionPaper, ...generatedQuestionPaper]; // append leftover questions to the generated questions. Will be all questions for the first try

        // Identify missing questions
        const blueprintQuestionIds = leftoverBlueprint.map(
          (question) => question.questionId
        );
        const generatedQuestionIds = generatedQuestionPaper.map(
          (question) => question.questionId
        );
        const missingQuestionIds = lodash.difference(
          blueprintQuestionIds,
          generatedQuestionIds
        );

        // If missing questions are found, update leftoverBlueprint and retry generating the missing questions using leftoverBlueprint
        if (missingQuestionIds.length !== 0) {
          console.log(
            `Missing questions: ${JSON.stringify(missingQuestionIds)}`
          );
          leftoverBlueprint = blueprint.filter((question) =>
            missingQuestionIds.includes(question.questionId)
          );
          retryCount++;
          continue;
        }
        break;
      }

      if (retryCount === MAX_RETRY_COUNT) {
        console.error("Failed to generate question paper");
        generatedPaper.update({ status: "failed" });
        await sendMessageOfFailure({
          countryCode: "+91",
          mobileNumber: req.user.mobileNumber,
          name,
        });
        return;
      }

      // Remove all extra responses from the generated questions (if any)
      questionPaper = questionPaper.filter((question) =>
        blueprintQuestionIds.includes(question.questionId)
      );
      const derivedMarks = questionPaper.reduce(
        (acc, question) => acc + question.marks,
        0
      );

      // Structure Generated Question Paper according to sections
      const structuredQuestionPaper = structureQuestionPaper({
        questionPaper,
        grade,
        academyName,
        totalMarks: totalMarks ?? derivedMarks,
        subject,
        timeDuration,
      });

      // Create multipleSets of question papers if numberOfSets > 1
      let allQuestionPapersSets = [structuredQuestionPaper];
      if (numberOfSets > 1) {
        allQuestionPapersSets = createQuestionPaperSets(
          structuredQuestionPaper,
          numberOfSets
        );
      }

      // Structure Generated Solution according to sections
      const structuredSolution = structureSolution({
        questionPaper,
        grade,
        academyName,
        totalMarks: totalMarks ?? derivedMarks,
        subject,
        timeDuration,
      });

      console.log(
        JSON.stringify(structuredQuestionPaper),
        "structured question paper"
      );
      console.log(JSON.stringify(structuredSolution), "structured solution");

      // Render HTML from the structured question paper
      const renderedQuestionPaperHTMLs = [];
      for (const questionPaper of allQuestionPapersSets) {
        const renderedQuestionPaperHTML = generateHTML(
          questionPaper,
          "./templates/questionPaperTemplate.mustache"
        );
        renderedQuestionPaperHTMLs.push(renderedQuestionPaperHTML);
      }

      // Render HTML from the structured solution
      const renderedSolutionHTML = generateHTML(
        structuredSolution,
        "./templates/solutionTemplate.mustache"
      );

      // TODO: use bluebird promise
      // Persist Question Paper HTMLs to S3
      const questionPaperHTMLUrls = [];
      let index = 0;
      for (const renderedQuestionPaperHTML of renderedQuestionPaperHTMLs) {
        const questionPaperHTMLUrl = await uploadToS3(
          renderedQuestionPaperHTML,
          `${name}-${++index}`,
          blueprint,
          "html"
        );
        questionPaperHTMLUrls.push(questionPaperHTMLUrl);
      }

      // Persist Solution HTMLs to S3
      const solutionHTMLUrl = await uploadToS3(
        renderedSolutionHTML,
        `solution-${name}`,
        blueprint,
        "html"
      );
      console.log(`Successfully uploaded question paper to S3`);

      // Update the QuestionPaper entry with the S3 URLs and status 'completed'
      await generatedPaper.update({
        questionPaperLink: questionPaperHTMLUrls[0],
        questionPapersLinks: questionPaperHTMLUrls,
        solutionLink: solutionHTMLUrl,
        status: "completed",
      });

      // Notify User
      const mobileNumber = req.user.mobileNumber;
      await sendMessageOfCompletion({ countryCode: "+91", mobileNumber, name });

      console.log("Successfully updated question status");
      return;
    } catch (error) {
      console.error("Error generating question paper:", error);
      return res
        .status(500)
        .json({ error: "Failed to generate question paper" });
    }
  }

  async getPaginatedQuestionPapers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { name, topics, grade, subject } = req.body;

      const whereClause = {};

      if (name) {
        whereClause.name = { [Op.regexp]: name };
      }

      if (topics) {
        const topicsArray = Array.isArray(topics) ? topics : [topics];
        whereClause.topics = { [Op.contains]: topicsArray };
      }

      if (grade) {
        whereClause.grade = grade;
      }

      if (subject) {
        whereClause.subject = subject;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await QuestionPaper.findAndCountAll({
        where: whereClause,
        order: [
          ["updatedAt", "DESC"],
          ["name", "DESC"],
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.status(200).json({
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching paginated question papers:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch paginated question papers" });
    }
  }

  async deleteQuestionPaper(req, res) {
    try {
      const { id } = req.params;
      const questionPaper = await QuestionPaper.findByPk(id);
      if (!questionPaper) {
        return res.status(404).json({ error: "Question paper not found" });
      }
      await questionPaper.destroy();
      res.status(200).json({ message: "Question paper deleted successfully" });
    } catch (error) {
      console.error("Error deleting question paper:", error);
      res.status(500).json({ error: "Failed to delete question paper" });
    }
  }
}

export const questionPaperController = new QuestionPaperController();
