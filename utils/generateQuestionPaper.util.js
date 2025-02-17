import fs from "fs";
import Mustache from "mustache";
import s3 from "./s3.js";
import { plivoClient } from "./plivoClient.js";

export function structureQuestionPaper({
  questionPaper,
  grade,
  academyName,
  totalMarks,
  subject,
  timeDuration,
}) {
  const hasMCQ = questionPaper.some((q) => q.type === "MCQ");
  const mcqQuestions = questionPaper.filter((q) => q.type === "MCQ");
  const descriptiveQuestions = questionPaper.filter((q) => q.type !== "MCQ");
  const distinctMarksSet = new Set(descriptiveQuestions.map((q) => q.marks));
  const distinctMarks = Array.from(distinctMarksSet).sort((a, b) => a - b);
  let nextSectionCharCode = "A".charCodeAt(0);
  if (hasMCQ) {
    nextSectionCharCode++;
  }

  const marksToSection = {};
  distinctMarks.forEach((mark) => {
    marksToSection[mark] = String.fromCharCode(nextSectionCharCode);
    nextSectionCharCode++;
  });

  const newQuestionPaper = [];

  if (hasMCQ) {
    let mcqCounter = 1;
    mcqQuestions.forEach((q) => {
      newQuestionPaper.push({
        ...q,
        section: "A",
        questionNumber: mcqCounter++,
      });
    });
  }

  const sectionToCounter = {};
  descriptiveQuestions.forEach((q) => {
    const section = marksToSection[q.marks];
    if (!section) return;

    if (sectionToCounter[section] == null) {
      sectionToCounter[section] = 1;
    }

    newQuestionPaper.push({
      ...q,
      section,
      questionNumber: sectionToCounter[section],
    });

    sectionToCounter[section]++;
  });

  const sectionMap = {};
  newQuestionPaper.forEach((q) => {
    const s = q.section;
    if (!sectionMap[s]) {
      sectionMap[s] = [];
    }
    sectionMap[s].push(q);
  });

  const sections = Object.keys(sectionMap)
    .sort()
    .map((sectionName) => {
      const questionsInSection = sectionMap[sectionName];

      const sectionMarks =
        questionsInSection.length > 0 ? questionsInSection[0].marks : 0;

      const sectionTotalMarks = questionsInSection.reduce(
        (acc, q) => acc + (q.marks || 0),
        0
      );

      const simpleQuestions = questionsInSection.map((q) => {
        return {
          questionNumber: q.questionNumber,
          question: q.question,
          isMCQ: q.type === "MCQ",
          options: q.type === "MCQ" ? q.options : undefined,
        };
      });

      return {
        name: sectionName,
        sectionNumberOfQuestions: simpleQuestions.length,
        sectionMarks,
        sectionTotalMarks,
        questions: simpleQuestions,
      };
    });

  return {
    sections,
    grade,
    academyName,
    totalMarks,
    subject,
    timeDuration,
  };
}

function addStepIndexes(calculationSteps) {
  return calculationSteps.map((step, idx) => ({
    ...step,
    stepIndex: idx + 1, // "1)", "2)", ...
  }));
}

export function structureSolution({
  questionPaper,
  grade,
  academyName,
  totalMarks,
  subject,
  timeDuration,
}) {
  const hasMCQ = questionPaper.some((q) => q.type === "MCQ");

  const mcqQuestions = questionPaper.filter((q) => q.type === "MCQ");
  const descriptiveQuestions = questionPaper.filter((q) => q.type !== "MCQ");

  const distinctMarksSet = new Set(descriptiveQuestions.map((q) => q.marks));
  const distinctMarks = Array.from(distinctMarksSet).sort((a, b) => a - b);

  let nextSectionCharCode = "A".charCodeAt(0);
  if (hasMCQ) {
    nextSectionCharCode++; // 'A' reserved for MCQ
  }

  const marksToSection = {};
  distinctMarks.forEach((mark) => {
    marksToSection[mark] = String.fromCharCode(nextSectionCharCode);
    nextSectionCharCode++;
  });

  const newQuestionPaper = [];

  if (hasMCQ) {
    let mcqCounter = 1;
    mcqQuestions.forEach((q) => {
      newQuestionPaper.push({
        ...q,
        section: "A",
        questionNumber: mcqCounter++,
      });
    });
  }

  const sectionToCounter = {};
  descriptiveQuestions.forEach((q) => {
    const sec = marksToSection[q.marks];
    if (!sec) return;

    if (sectionToCounter[sec] == null) {
      sectionToCounter[sec] = 1;
    }

    newQuestionPaper.push({
      ...q,
      section: sec,
      questionNumber: sectionToCounter[sec],
    });

    sectionToCounter[sec]++;
  });

  const sectionMap = {};
  newQuestionPaper.forEach((q) => {
    if (!sectionMap[q.section]) {
      sectionMap[q.section] = [];
    }
    sectionMap[q.section].push(q);
  });

  const sections = Object.keys(sectionMap)
    .sort()
    .map((sectionName) => {
      const questionsInSection = sectionMap[sectionName];

      const sectionMarks =
        questionsInSection.length > 0 ? questionsInSection[0].marks : 0;

      const sectionTotalMarks = questionsInSection.reduce(
        (acc, q) => acc + (q.marks || 0),
        0
      );

      const structuredQuestions = questionsInSection.map((q) => {
        let correctAnswerLabel = q.correctAnswer;
        let correctAnswerOption = q.correctAnswer;

        if (q.type === "MCQ" && Array.isArray(q.options)) {
          const found = q.options.find((opt) => opt.key === q.correctAnswer);
          if (found) {
            correctAnswerOption = found.option;
          }
        }

        const orderedCalculationSteps = addStepIndexes(q.calculationSteps);

        return {
          questionNumber: q.questionNumber,
          question: q.question,
          marks: q.marks,
          topic: q.topic,
          difficulty: q.difficulty,
          isMCQ: q.type === "MCQ",
          correctAnswer: q.correctAnswer,
          correctAnswerLabel,
          correctAnswerOption,
          calculationSteps: orderedCalculationSteps || [],
        };
      });

      return {
        name: sectionName,
        sectionNumberOfQuestions: structuredQuestions.length,
        sectionMarks,
        sectionTotalMarks,
        questions: structuredQuestions,
      };
    });

  // 8. Return final object with top-level fields
  return {
    academyName,
    subject,
    grade,
    totalMarks,
    timeDuration,
    sections,
  };
}

export function generateHTML(structuredQuestionPaper, templatePath) {
  const template = fs.readFileSync(templatePath, "utf-8");
  return Mustache.render(template, structuredQuestionPaper);
}

export function getOpenAIMessages(blueprint, prompts) {
  const systemPrompt = prompts.generateQuestionPaper.system;
  const userPrompt = prompts.generateQuestionPaper.user.replace(
    '```json\n{\n    "blueprint": []\n}\n```',
    `\`\`\`json\n${JSON.stringify({ blueprint }, null, 4)}\n\`\`\``
  );

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export function getOpenAIMessagesForExtractedTextToQuestions(extractedText) {
  const systemPrompt = `You are a middleware that is supposed to convert unstructured raw text of question papers into structured responses as provided in the response format. Make sure that all equations are surrounded by katex syntax. Do not change any content of the paper. If the difficulty and marks are not provided, make the difficulty medium and marks 1`
  const userPrompt = `Extract questions from the following question paper text in the required responseFormat:
\`\`\`text
${extractedText}
\`\`\``

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export async function uploadToS3(content, name, fileType) {
  const fileKey = `questionPapers/${name}.${fileType}`;
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
    Body: content,
    ContentType: fileType === "html" ? "text/html" : "application/pdf",
  };

  await s3.upload(uploadParams).promise();
  const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
  return fileUrl;
}
export function getQuestionPaperWithSolutionResponseFormat() {
  return {
    type: "json_schema",
    json_schema: {
      name: "quiz_schema",
      strict: true,
      schema: {
        type: "object",
        properties: {
          answer: {
            type: "array",
            description:
              "A collection of answers, each can be a multiple choice or descriptive question. **All math equations must be wrapped between $ and $.**",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["MCQ", "Descriptive"],
                  description: "The type of the question.",
                },
                questionId: {
                  type: "string",
                  description:
                    "The questionId of the question corresponding to the description of the question in the prompt.",
                },
                question: {
                  type: "string",
                  description:
                    "The question being asked. **All math equations must be wrapped between $ and $.**",
                },
                marks: {
                  type: "number",
                  description: "The marks assigned for the question.",
                },
                options: {
                  anyOf: [
                    {
                      type: "array",
                      description:
                        "Options for multiple choice questions. **All math equations must be wrapped between $ and $.**",
                      items: {
                        type: "object",
                        properties: {
                          key: {
                            type: "string",
                            description:
                              "The key for the option, e.g., A, B, C, D.",
                          },
                          option: {
                            type: "string",
                            description:
                              "The text of the option. **All math equations must be wrapped between $ and $.**",
                          },
                        },
                        required: ["key", "option"],
                        additionalProperties: false,
                      },
                    },
                    {
                      type: "null",
                      description:
                        "Null for descriptive questions without options.",
                    },
                  ],
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                  description: "The difficulty level of the question.",
                },
                topic: {
                  type: "string",
                  description: "The topic related to the question.",
                },
                correctAnswer: {
                  type: "string",
                  description:
                    "The correct answer for the question. **All math equations must be wrapped between $ and $.**",
                },
                calculationSteps: {
                  type: "array",
                  description:
                    "Steps to arrive at the solution. **All math equations must be wrapped between $ and $.**",
                  items: {
                    type: "object",
                    properties: {
                      chainOfThoughtExplanation: {
                        type: "string",
                        description:
                          "Explanation of the thought process. **All math equations must be wrapped between $ and $.**",
                      },
                      equation: {
                        type: "string",
                        description:
                          "The equation or result at this step. **All math equations must be wrapped between $ and $.**",
                      },
                    },
                    required: ["chainOfThoughtExplanation", "equation"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "type",
                "questionId",
                "question",
                "marks",
                "options",
                "difficulty",
                "topic",
                "correctAnswer",
                "calculationSteps",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
    },
  };
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index between 0 and i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at indices i and j
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function createQuestionPaperSets(questionPaper, numberOfSets) {
  const sets = [];

  for (let setIndex = 0; setIndex < numberOfSets; setIndex++) {
    // Deep clone the original question paper to avoid mutations
    const clonedPaper = deepClone(questionPaper);

    // Shuffle questions within each section
    clonedPaper.sections.forEach((section) => {
      if (section.questions && section.questions.length > 1) {
        shuffleArray(section.questions);
      }
    });

    sets.push(clonedPaper);
  }

  return sets;
}

export const sendMessageOfCompletion = async ({
  countryCode,
  mobileNumber,
  name,
}) => {
  const URL_TO_REDIRECT_TO = `https://www.gotutorless.com/question-paper-list`;
  try {
    if (!mobileNumber || !countryCode) {
      console.error("Mobile number and country code are not present");
      return;
    }

    const response = await plivoClient.messages.create(
      process.env.PLIVO_PHONE_NUMBER,
      `${countryCode}${mobileNumber}`,
      `${name} question paper was generated successfully.
      You can check the generated question paper here: ${URL_TO_REDIRECT_TO}.
      Thank you`
    );

    if (response) {
      console.log("Message sent succesfully");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

export const sendMessageOfFailure = async ({
  countryCode,
  mobileNumber,
  name,
}) => {
  try {
    if (!mobileNumber || !countryCode) {
      console.error("Mobile number and country code are not present");
      return;
    }

    const response = await plivoClient.messages.create(
      process.env.PLIVO_PHONE_NUMBER,
      `${countryCode}${mobileNumber}`,
      `${name} question paper FAILED to generate.
      This might happen due to some technical issue at our end. We apologize for the inconvenience caused.
      You can retry generating the question paper.
      If the problem persists, please reach out to our support team.`
    );

    if (response) {
      console.log("Message sent succesfully");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

export function getQuestionPaperFromExtractedTextResponseFormat() {
  return {
    type: "json_schema",
    json_schema: {
      name: "quiz_schema",
      strict: true,
      schema: {
        type: "object",
        properties: {
          answer: {
            type: "array",
            description:
              "A collection of answers, each can be a multiple choice or descriptive question. **All math equations must be wrapped between $ and $.**",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["MCQ", "Descriptive"],
                  description: "The type of the question.",
                },
                questionId: {
                  type: "string",
                  description:
                    "The questionId of the question corresponding to the description of the question in the prompt.",
                },
                question: {
                  type: "string",
                  description:
                    "The question being asked. **All math equations must be wrapped between $ and $.**",
                },
                marks: {
                  type: "number",
                  description: "The marks assigned for the question.",
                },
                options: {
                  anyOf: [
                    {
                      type: "array",
                      description:
                        "Options for multiple choice questions. **All math equations must be wrapped between $ and $.**",
                      items: {
                        type: "object",
                        properties: {
                          key: {
                            type: "string",
                            description:
                              "The key for the option, e.g., A, B, C, D.",
                          },
                          option: {
                            type: "string",
                            description:
                              "The text of the option. **All math equations must be wrapped between $ and $.**",
                          },
                        },
                        required: ["key", "option"],
                        additionalProperties: false,
                      },
                    },
                    {
                      type: "null",
                      description:
                        "Null for descriptive questions without options.",
                    },
                  ],
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                  description: "The difficulty level of the question.",
                },
              },
              required: [
                "type",
                "questionId",
                "question",
                "marks",
                "options",
                "difficulty"
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["answer"],
        additionalProperties: false,
      },
    },
  };
}
