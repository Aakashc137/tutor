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
import { sendMessageOfCompletion } from "./questionController.js";
import {
  compareBluePrintAndOpenaiHashmaps,
  convertDiffToArray,
  processBlueprintData,
  processResponseData,
} from "../utils/processBlueprint.js";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRY_COUNT = 4;

class QuestionPaperController {
  async generateQuestionPaper(req, res) {
    try {
      const { name, blueprint, grade, subject, totalMarks, lengthOfBlueprint, numberOfSets = 1, academyName, timeDuration } =
        req.body;
      let bluePrintToUseForPrompts = blueprint;
      const REQUIRED_FIELDS = [
        { field: blueprint, message: "Blueprint is required" },
        { field: name, message: "Name is required" },
        { field: grade, message: "Grade is required" },
        { field: subject, message: "Subject is required" },
      ];
      const bluePrintHashMap = processBlueprintData(blueprint);
      for (const { field, message } of REQUIRED_FIELDS) {
        if (!field) {
          return res.status(400).json({ error: message });
        }
      }

      const topics = lodash.uniq(blueprint.map((question) => question.topic));

      // Create a new QuestionPaper entry with status 'inProgress'
      const generatedPaper = await QuestionPaper.create({
        name,
        grade,
        topics,
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
      while (retryCount < MAX_RETRY_COUNT) {
        let messages = getOpenAIMessages(bluePrintToUseForPrompts, prompts);
        const response = await openai.beta.chat.completions.parse({
          model: "gpt-4o",
          messages,
          response_format: responseFormat,
        });
        const result = response.choices[0].message.parsed;
        console.log("result length", result.answer.length)
        questionPaper = [...questionPaper, ...result.answer];
        console.log("questionPaper length", questionPaper.length)
        if (questionPaper && questionPaper.length >= lengthOfBlueprint) {
          break;
        }
        const openAiHashMap = processResponseData(questionPaper);
        const diffInResults = compareBluePrintAndOpenaiHashmaps(
          bluePrintHashMap,
          openAiHashMap
        );
        const diffBluePrintForRemainingQuestions =
          convertDiffToArray(diffInResults);
        bluePrintToUseForPrompts = diffBluePrintForRemainingQuestions;
        retryCount++;
      }
      const structuredQuestionPaper = structureQuestionPaper({
        questionPaper,
        grade,
        academyName,
        totalMarks,
        subject,
        timeDuration
      });

      let allQuestionPapersSets = [structuredQuestionPaper];
      if (numberOfSets > 1) {
        allQuestionPapersSets = createQuestionPaperSets(structuredQuestionPaper, numberOfSets);
      }
      const structuredSolution = structureSolution({
        questionPaper,
        grade,
        academyName,
        totalMarks,
        subject,
        timeDuration,
      });

      const renderedQuestionPaperHTMLs = [];
      for (const questionPaper of allQuestionPapersSets) {
        const renderedQuestionPaperHTML = generateHTML(
          questionPaper,
          "./templates/questionPaperTemplate.mustache"
        );
        renderedQuestionPaperHTMLs.push(renderedQuestionPaperHTML);
      }

      const renderedSolutionHTML = generateHTML(
        structuredSolution,
        "./templates/solutionTemplate.mustache"
      );

      // TODO: use bluebird promise
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
      const mobileNumber = req.user.mobileNumber;
      //on completion send api
      await sendMessageOfCompletion({ countryCode: "+91", mobileNumber, name });
      console.log("Successfully updated question status");
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
