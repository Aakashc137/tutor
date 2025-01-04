export function structureQuestionPaper(questionPaper) {
  // 1. Determine if there are any MCQ questions
  const hasMCQ = questionPaper.some(q => q.type === 'MCQ');

  // 2. Separate MCQ & descriptive
  const mcqQuestions = questionPaper.filter(q => q.type === 'MCQ');
  const descriptiveQuestions = questionPaper.filter(q => q.type !== 'MCQ');

  // 3. Identify distinct marks among descriptive for assigning sections
  const distinctMarksSet = new Set(descriptiveQuestions.map(q => q.marks));
  const distinctMarks = Array.from(distinctMarksSet).sort((a, b) => a - b);

  // 4. Start from 'A'. If we have MCQs, 'A' is for MCQs, so move next to 'B'
  let nextSectionCharCode = 'A'.charCodeAt(0);
  if (hasMCQ) {
    // Reserve 'A' for all MCQs
    nextSectionCharCode++;
  }

  // 5. Build a map from marks -> section letter
  const marksToSection = {};
  distinctMarks.forEach(mark => {
    marksToSection[mark] = String.fromCharCode(nextSectionCharCode);
    nextSectionCharCode++;
  });

  // 6. Build a new array with updated info (section & questionNumber)
  const newQuestionPaper = [];

  // 6a. If MCQ exists, they all go to section A with questionNumber 1..n
  if (hasMCQ) {
    let mcqCounter = 1;
    mcqQuestions.forEach(q => {
      newQuestionPaper.push({
        ...q,
        section: 'A',
        questionNumber: mcqCounter++,
      });
    });
  }

  // 6b. Descriptive questions get sections based on their marks
  const sectionToCounter = {};
  descriptiveQuestions.forEach(q => {
    const section = marksToSection[q.marks];
    if (!section) return; // Should not happen unless question has an unexpected mark

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

  // 7. Group the newly structured questions by section
  const sectionMap = {};
  newQuestionPaper.forEach(q => {
    const s = q.section;
    if (!sectionMap[s]) {
      sectionMap[s] = [];
    }
    sectionMap[s].push(q);
  });

  // 8. Build the final sections array
  //    Sort section keys (A, B, C, ...)
  const sections = Object.keys(sectionMap)
    .sort()
    .map(sectionName => {
      // All questions in this section
      const questionsInSection = sectionMap[sectionName];

      // Because we group by marks, each question in this section should have the same marks
      // So we can just take it from the first question
      const sectionMarks =
        questionsInSection.length > 0 ? questionsInSection[0].marks : 0;

      // Sum up the marks of all questions in the section (they should be identical anyway)
      const sectionTotalMarks = questionsInSection.reduce(
        (acc, q) => acc + (q.marks || 0),
        0
      );

      // Prepare the "questions" array in the desired minimal format
      const simpleQuestions = questionsInSection.map(q => {
        return {
          questionNumber: q.questionNumber,
          question: q.question,
          isMCQ: q.type === 'MCQ',
          options: q.type === 'MCQ' ? q.options : undefined
        };
      });

      return {
        name: sectionName,                 // e.g. "A", "B", ...
        sectionNumberOfQuestions: simpleQuestions.length,
        sectionMarks,                      // single number
        sectionTotalMarks,                 // sum
        questions: simpleQuestions,
      };
    });

  // 9. Return final structure
  return { sections, grade: "10", academyName: "Sample Input Academy Name", totalMarks: "85", subject: "Maths" };
}