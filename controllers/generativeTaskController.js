import OpenAI from 'openai';
import prompts from '../generativeTask/utils/prompts.json' assert { type: 'json' };
import { structureQuestionPaper, structureSolution, getOpenAIMessages, generateHTML, getResponseFormat, uploadToS3 } from '../utils/generateQuestionPaper.util.js';

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRY_COUNT = 2;

class GenerativeTaskController {
    async generateQuestionPaper(req, res) {
        try {
            const { name, blueprint } = req.body;

            if (!blueprint) {
                return res.status(400).json({ error: 'Blueprint is required' });
            }

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

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
                return res.status(500).json({ error: 'Failed to generate correct question paper', incorrectQuestionPaper: questionPaper });
            }

            const structuredQuestionPaper = structureQuestionPaper(questionPaper);
            const structuredSolution = structureSolution(questionPaper);

            const renderedQuestionPaperHTML = generateHTML(structuredQuestionPaper, './templates/questionPaperTemplate.mustache');
            const renderedSolutionHTML = generateHTML(structuredSolution, './templates/solutionTemplate.mustache');

            const questionPaperHTMLUrl = await uploadToS3(renderedQuestionPaperHTML, name, blueprint, 'html');
            const solutionHTMLUrl = await uploadToS3(renderedSolutionHTML, `solution-${name}`, blueprint, 'html');

            console.log('Successfully uploaded question paper to S3!');
            return res.status(200).json({
                message: 'Successfully uploaded question paper to S3!',
                questionPaperHTMLUrl,
                solutionHTMLUrl,
            });
        } catch (error) {
            console.error('Error generating question paper:', error);
            return res.status(500).json({ error: 'Failed to generate question paper' });
        }
    }
}

export const generativeTaskController = new GenerativeTaskController();