import OpenAI from 'openai';
import prompts from '../generativeTask/utils/prompts.json' assert { type: 'json' };
import { structureQuestionPaper, structureSolution, getOpenAIMessages, generateHTML, getResponseFormat, uploadToS3 } from '../utils/generateQuestionPaper.util.js';
import { QuestionPaper } from '../models/questionPaper.js';
import lodash from 'lodash';
import { Op, Sequelize } from 'sequelize';

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRY_COUNT = 2;

class QuestionPaperController {
    async generateQuestionPaper(req, res) {
        try {
            const { name, blueprint, grade, subject } = req.body;

            if (!blueprint) {
                return res.status(400).json({ error: 'Blueprint is required' });
            }

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

            if (!grade) {
                return res.status(400).json({ error: 'Grade is required' });
            }

           const topics = lodash.uniq(blueprint.map((question) => question.topic));

            if (!subject) {
                return res.status(400).json({ error: 'Subject is required' });
            }

            // Create a new QuestionPaper entry with status 'inProgress'
            const generatedPaper = await QuestionPaper.create({
                name,
                grade,
                topics,
                subject,
                status: 'inProgress',
            });

            res.status(200).json({ message: 'Question paper generation started', questionPaper: generatedPaper });

            const messages = getOpenAIMessages(req, prompts);
            const responseFormat = getResponseFormat();

            let retryCount = 0;
            let questionPaper;
            while (retryCount < MAX_RETRY_COUNT) {
                const response = await openai.beta.chat.completions.parse({
                    model: 'gpt-4o',
                    messages,
                    response_format: responseFormat,
                });

                const result = response.choices[0].message.parsed;
                questionPaper = result.answer;
                if (questionPaper && questionPaper.length === blueprint.length) {
                    break;
                }
                retryCount++;
            }

            if (!questionPaper || questionPaper.length !== blueprint.length) {
                // Update status to 'failed'
                await generatedPaper.update({ status: 'failed' });
                return res.status(500).json({ error: 'Failed to generate correct question paper', incorrectQuestionPaper: questionPaper });
            }

            const structuredQuestionPaper = structureQuestionPaper(questionPaper);
            const structuredSolution = structureSolution(questionPaper);

            const renderedQuestionPaperHTML = generateHTML(structuredQuestionPaper, './templates/questionPaperTemplate.mustache');
            const renderedSolutionHTML = generateHTML(structuredSolution, './templates/solutionTemplate.mustache');

            const questionPaperHTMLUrl = await uploadToS3(renderedQuestionPaperHTML, name, blueprint, 'html');
            const solutionHTMLUrl = await uploadToS3(renderedSolutionHTML, `solution-${name}`, blueprint, 'html');
            console.log(`Successfully uploaded question paper to S3`);

            // Update the QuestionPaper entry with the S3 URLs and status 'completed'
            await generatedPaper.update({
                questionPaperLink: questionPaperHTMLUrl,
                solutionLink: solutionHTMLUrl,
                status: 'completed',
            });

            console.log('Successfully updated question status');
        } catch (error) {
            console.error('Error generating question paper:', error);
            return res.status(500).json({ error: 'Failed to generate question paper' });
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
                    ['updatedAt', 'DESC'],
                    ['name', 'DESC'],
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
            console.error('Error fetching paginated question papers:', error);
            res.status(500).json({ error: 'Failed to fetch paginated question papers' });
        }
    }
}

export const questionPaperController = new QuestionPaperController();