import {
  addStepIndexes,
  generateHTML,
  getOpenAIMessages,
  getResponseFormatForWorksheet,
} from "../utils/generateQuestionPaper.util.js";
import prompts from "../generativeTask/utils/prompts.json" assert { type: "json" };
import lodash from "lodash";
import OpenAI from "openai";

/**
 * Helper function to generate an 8-digit alphanumeric UUID.
 * @returns {string} An 8-character alphanumeric string.
 */
function generateRandomUUID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let uuid = "";
  for (let i = 0; i < 8; i++) {
    uuid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uuid;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


/**
 * Converts an array of student objects into the desired format.
 * Each student object in the input array should have:
 *   - name: The name of the student (string)
 *   - topics: An array of topics (array of strings) in which the student is weak.
 *
 * For each topic, an object is generated with the following properties:
 *   - topic: the topic name,
 *   - difficulty: randomly chosen as either "easy" or "medium",
 *   - type: randomly chosen as either "mcq" or "descriptive",
 *   - uuid: a unique 8-digit alphanumeric string,
 *   - marks: if type is "mcq" then marks is 1; if descriptive, marks is either 2 or 3.
 *
 * The output is an array of objects where each object has a single key (student's name)
 * and its value is the array of generated topic objects.
 *
 * @param {Array} students - An array of objects, each with properties `name` and `topics`.
 * @returns {Array} An array of objects in the desired format.
 */
function convertStudents(students) {
  let studentWithTheirRespectiveBlueprints = students.map((student) => {
    const { name, lessonspraticeneededfor } = student;

    // For each topic, create the desired object.
    const topicObjects = [
      ...lessonspraticeneededfor,
      ...lessonspraticeneededfor,
    ].map((obj) => {
      // Randomly select question type: "mcq" or "descriptive"
      const type = Math.random() < 0.5 ? "mcq" : "descriptive";

      // Assign marks based on type: 1 for mcq; for descriptive, choose 2 or 3 marks.
      const marks = type === "mcq" ? 1 : Math.random() < 0.5 ? 2 : 3;

      // Randomly assign difficulty: "easy" or "medium"
      const difficulty = Math.random() < 0.5 ? "easy" : "medium";
      const topic = obj.topic;
      const subject = obj.subject;

      return {
        topic,
        subject,
        difficulty,
        type,
        questionId: generateRandomUUID(),
        marks,
      };
    });

    // Create an object with the student's name as key and the topic objects as value.
    return { [name]: topicObjects };
  });
  getWorksheetForStudents(studentWithTheirRespectiveBlueprints);
}


async function getWorksheetForStudents(studentData) {
  for (let student of studentData) {
    let individualstudentdata = Object.keys(student);
    let blueprint = student[individualstudentdata];
    const responseFormat = getResponseFormatForWorksheet();
    let retryCount = 0;
    let questionPaper = [];
    let leftoverblueprint = blueprint;
    const blueprintQuestionIds = blueprint.map(
      (question) => question.questionId
    );
    while (retryCount < 3) {
      let messages = getOpenAIMessages(leftoverblueprint, prompts);
      const response = await openai.beta.chat.completions.parse({
        model: "gpt-4o",
        messages,
        response_format: responseFormat,
      });
      const result = response.choices[0].message.parsed;
      const generatedQuestionpPaper = result.answer ?? [];
      questionPaper = [...questionPaper, ...generatedQuestionpPaper]; // append leftover questions to the generated questions. Will be all questions for the first try
      const blueprintQuestionIds = leftoverblueprint.map(
        (question) => question.questionId
      );
      const generatedQuestionIds = questionPaper.map(
        (question) => question.questionId
      );
      const missingQuestionIds = lodash.difference(
        blueprintQuestionIds,
        generatedQuestionIds
      );
      if (missingQuestionIds.length !== 0) {
        console.log(`Missing questions: ${JSON.stringify(missingQuestionIds)}`);
        leftoverBlueprint = blueprint.filter((question) =>
          missingQuestionIds.includes(question.questionId)
        );
        retryCount++;
        continue;
      }
      break;
    }
    if (retryCount === 3) {
      console.log(
        `Failed to generate questions for student ${individualstudentdata}`
      );
      continue;
    }
    questionPaper = questionPaper.filter((question) =>
      blueprintQuestionIds.includes(question.questionId)
    );

    const structuredQuestionPaper = structureQuestionsBySubject(questionPaper);
    const subjectsForQuestions = Object.keys(structuredQuestionPaper).map(
      (key) => structuredQuestionPaper[key]
    );
    const templateDataForQuestions = { subjectsForQuestions };
    const structuredSolutionSheet = structureSolutionsBySubject(questionPaper);
    const subjectsForSolutions = Object.keys(structuredSolutionSheet).map(
      (key) => structuredSolutionSheet[key]
    );
    const templateDataForSolutions = { subjectsForSolutions };
    const renderedQuestionPaperHTML = generateHTML(
      templateDataForQuestions,
      "../templates/questionPaperWorksheetTemplate.mustache"
    );
    const renderedSolutionSheetHTML = generateHTML(
      templateDataForSolutions,
      "../templates/solutionPaperWorksheetTemplate.mustache"
    );
    console.log(renderedQuestionPaperHTML, "render question paper html");
  }
}

convertStudents([
  {
    name: "Alice",
    lessonspraticeneededfor: [
      { topic: "Algebra", subject: "Maths" },
      { topic: "Algebra", subject: "Maths" },
    ],
  },
]);

export function structureQuestionsBySubject(questionPaper) {
  const subjectsMap = {};

  questionPaper.forEach((q) => {
    const subject = q.subject;
    if (!subjectsMap[subject]) {
      subjectsMap[subject] = [];
    }
    subjectsMap[subject].push(q);
  });

  const structuredSubjects = {};

  Object.keys(subjectsMap).forEach((subject) => {
    const questions = subjectsMap[subject];

    const hasMCQ = questions.some((q) => q.type === "MCQ");
    const mcqQuestions = questions.filter((q) => q.type === "MCQ");
    const descriptiveQuestions = questions.filter((q) => q.type !== "MCQ");

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

    structuredSubjects[subject] = {
      subject,
      sections,
    };
  });

  return structuredSubjects;
}

export function structureSolutionsBySubject(questionPaper) {
  const subjectsMap = {};

  questionPaper.forEach((q) => {
    const subject = q.subject;
    if (!subjectsMap[subject]) {
      subjectsMap[subject] = [];
    }
    subjectsMap[subject].push(q);
  });

  const structuredSubjects = {};

  Object.keys(subjectsMap).forEach((subject) => {
    const questions = subjectsMap[subject];

    const hasMCQ = questions.some((q) => q.type === "MCQ");
    const mcqQuestions = questions.filter((q) => q.type === "MCQ");
    const descriptiveQuestions = questions.filter((q) => q.type !== "MCQ");

    const distinctMarksSet = new Set(descriptiveQuestions.map((q) => q.marks));
    const distinctMarks = Array.from(distinctMarksSet).sort((a, b) => a - b);

    let nextSectionCharCode = "A".charCodeAt(0);
    if (hasMCQ) {
      nextSectionCharCode++; // 'A' reserved for MCQs
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

    structuredSubjects[subject] = {
      subject,
      sections,
    };
  });

  return structuredSubjects;
}
