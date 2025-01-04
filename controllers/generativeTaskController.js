import OpenAI from 'openai';
import prompts from '../generativeTask/utils/prompts.json' assert { type: 'json' };
import { USER_PROMPT_GENERATE_QUESTION_PAPER } from '../generativeTask/utils/promptUtil.js';
import { handleGeneratePDFs } from '../generativeTask/utils/htmlToPdf.util.js';
import {structureQuestionPaper} from '../utils/generateQuestionPaper.util.js';
import fs from 'fs';
import Mustache from 'mustache';

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRY_COUNT = 2;

class GenerativeTaskController {
    async generateQuestionPaper(req, res) {
        try{
            const { blueprint } = req.body;
        
            if (!blueprint) {
                return res.status(400).json({ error: 'Blueprint is required' });
            }
        
            const systemPrompt = prompts.generateQuestionPaper.system;
            const userPrompt = prompts.generateQuestionPaper.user.replace(
                '```json\n{\n    "blueprint": []\n}\n```',
                `\`\`\`json\n${JSON.stringify({ blueprint }, null, 4)}\n\`\`\``
            );
        
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];
        
            const responseFormat = {
                type: 'json_schema',
                json_schema: {
                    name: 'quiz_schema',
                    strict: true,
                    schema: {
                        type: 'object',
                        properties: {
                            answer: {
                                type: 'array',
                                description: 'A collection of answers, each can be a multiple choice or descriptive question.',
                                items: {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['MCQ', 'Descriptive'],
                                            description: 'The type of the question.',
                                        },
                                        questionId: {
                                            type: 'string',
                                            description: 'The questionId of the question corresponding to the description of the question in the prompt',
                                        },
                                        question: {
                                            type: 'string',
                                            description: 'The question being asked.',
                                        },
                                        marks: {
                                            type: 'number',
                                            description: 'The marks assigned for the question.',
                                        },
                                        options: {
                                            anyOf: [
                                                {
                                                    type: 'array',
                                                    description: 'Options for multiple choice questions.',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            key: {
                                                                type: 'string',
                                                                description: 'The key for the option, e.g., A, B, C, D.',
                                                            },
                                                            option: {
                                                                type: 'string',
                                                                description: 'The text of the option.',
                                                            },
                                                        },
                                                        required: ['key', 'option'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                                {
                                                    type: 'null',
                                                    description: 'Null for descriptive questions without options.',
                                                },
                                            ],
                                        },
                                        difficulty: {
                                            type: 'string',
                                            enum: ['EASY', 'MEDIUM', 'HARD'],
                                            description: 'The difficulty level of the question.',
                                        },
                                        topic: {
                                            type: 'string',
                                            description: 'The topic related to the question.',
                                        },
                                        correctAnswer: {
                                            type: 'string',
                                            description: 'The correct answer for the question.',
                                        },
                                        calculationSteps: {
                                            type: 'array',
                                            description: 'Steps to arrive at the solution.',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    chainOfThoughtExplanation: {
                                                        type: 'string',
                                                        description: 'Explanation of the thought process.',
                                                    },
                                                    equation: {
                                                        type: 'string',
                                                        description: 'The equation or result at this step.',
                                                    },
                                                },
                                                required: ['chainOfThoughtExplanation', 'equation'],
                                                additionalProperties: false,
                                            },
                                        },
                                    },
                                    required: [
                                        'type',
                                        'questionId',
                                        'question',
                                        'marks',
                                        'options',
                                        'difficulty',
                                        'topic',
                                        'correctAnswer',
                                        'calculationSteps',
                                    ],
                                    additionalProperties: false,
                                },
                            },
                        },
                        required: ['answer'],
                        additionalProperties: false,
                    },
                },
            };

            let retryCount = 0;
            let questionPaper;
            while(retryCount < MAX_RETRY_COUNT) {
                const response = await openai.beta.chat.completions.parse({
                    model: 'gpt-4o',
                    messages,
                    response_format: responseFormat,
                });
        
                const result = response. choices[0].message.parsed;
                questionPaper = result.answer;
                if(questionPaper && questionPaper.length === blueprint.length) {
                    break;
                }
                retryCount++;
            }

            if(!questionPaper || questionPaper.length !== blueprint.length) {
                res.status(500).json({ error: 'Failed to generate correct question paper', incorrectQuestionPaper: questionPaper });
            }

            const structuredQuestionPaper = structureQuestionPaper(questionPaper); 
            const template = fs.readFileSync('/Users/aakash/Learning/tutor/templates/questionPaperTemplate.mustache', 'utf-8');        
            const renderedHTML = Mustache.render(template, structuredQuestionPaper);

            // 4. Write the rendered HTML to a file
            fs.writeFileSync('questionPaper.html', renderedHTML, 'utf-8');
            console.log('Successfully rendered questionPaper.html!');
            return res.status(200).json({message:'Successfully rendered questionPaper.html!'});
        } catch (error) {
            console.error('Error generating question paper:', error);
            res.status(500).json({ error: 'Failed to generate question paper' });
        }
    }

    async renderSampleMustache(req,res){
        const template = fs.readFileSync('/Users/aakash/Learning/tutor/templates/questionPaperTemplate.mustache', 'utf-8');

        // 2. Read your JSON
        const questionPaper = JSON.parse(
            fs.readFileSync('/Users/aakash/Learning/tutor/templates/questionPaperData.json', 'utf-8')
        );

        // 3. Render with Mustache, passing { questionPaper: ... } as the view object
        const renderedHTML = Mustache.render(template, questionPaper);

        // 4. Write the rendered HTML to a file
        fs.writeFileSync('questionPaper.html', renderedHTML, 'utf-8');

        console.log('Successfully rendered questionPaper.html!');
        return res.status(200).json({message:'Successfully rendered questionPaper.html!'});
    }
}

export const generativeTaskController = new GenerativeTaskController();