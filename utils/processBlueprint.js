export function processBlueprintData(data) {
  // Initialize the result object
  const result = {};

  // Iterate through the input data
  data.forEach((question) => {
    const { topic, type, marks } = question;

    // Initialize topic if not present
    if (!result[topic]) {
      result[topic] = {
        MCQ: [],
        Descriptive: [],
      };
    }

    // Determine the question type
    const questionType =
      type === "Multiple Choice Question" ? "MCQ" : "Descriptive";
    const questionMarks = parseInt(marks, 10);

    // Check if the marks already exist in the MCQ or Descriptive array for the topic
    const existingEntry = result[topic][questionType].find(
      (entry) => entry.Marks === questionMarks
    );

    if (existingEntry) {
      // If entry exists, increment the question count (NoOfQ)
      existingEntry.NoOfQ += 1;
    } else {
      // If entry doesn't exist, create a new entry
      result[topic][questionType].push({ Marks: questionMarks, NoOfQ: 1 });
    }
  });

  // Return the result
  return result;
}

export function processResponseData(data) {
  // Initialize the result object
  const result = {};

  // Iterate through the input data
  data.forEach((question) => {
    const { topic, type, marks } = question;

    // Initialize topic if not present
    if (!result[topic]) {
      result[topic] = {
        MCQ: [],
        Descriptive: [],
      };
    }

    // Determine the question type (MCQ or Descriptive)
    const questionType = type === "MCQ" ? "MCQ" : "Descriptive";
    const questionMarks = parseInt(marks, 10); // Ensure marks are treated as integers

    // Check if the marks already exist in the MCQ or Descriptive array for the topic
    const existingEntry = result[topic][questionType].find(
      (entry) => entry.Marks === questionMarks
    );

    if (existingEntry) {
      // If entry exists, increment the question count (NoOfQ)
      existingEntry.NoOfQ += 1;
    } else {
      // If entry doesn't exist, create a new entry
      result[topic][questionType].push({ Marks: questionMarks, NoOfQ: 1 });
    }
  });

  // Return the result
  return result;
}



export function compareBluePrintAndOpenaiHashmaps(oldData, newData) {
  const differences = {};

  // Iterate over each topic in the newData
  Object.keys(newData).forEach(topic => {
    const oldTopic = oldData[topic] || { MCQ: [], Descriptive: [] };
    const newTopic = newData[topic];

    // Initialize the topic entry in the differences object
    const diffTopic = {
      MCQ: [],
      Descriptive: []
    };

    // Compare MCQs for the current topic
    newTopic.MCQ.forEach(newMCQ => {
      const oldMCQ = oldTopic.MCQ.find(mcq => mcq.Marks === newMCQ.Marks) || { NoOfQ: 0 };
      const diffNoOfQ = oldMCQ.NoOfQ - newMCQ.NoOfQ;

      // Ensure that the difference is positive (if the second set has fewer questions)
      if (diffNoOfQ > 0) {
        diffTopic.MCQ.push({ Marks: newMCQ.Marks, NoOfQ: diffNoOfQ });
      }
    });

    // Compare Descriptive questions for the current topic
    newTopic.Descriptive.forEach(newDescriptive => {
      const oldDescriptive = oldTopic.Descriptive.find(descriptive => descriptive.Marks === newDescriptive.Marks) || { NoOfQ: 0 };
      const diffNoOfQ = Math.abs(oldDescriptive.NoOfQ - newDescriptive.NoOfQ);

      // Ensure that the difference is positive (if the second set has fewer questions)
      if (diffNoOfQ > 0) {
        diffTopic.Descriptive.push({ Marks: newDescriptive.Marks, NoOfQ: diffNoOfQ });
      }
    });

    // Only add the topic to the differences object if there are differences in MCQ or Descriptive
    if (diffTopic.MCQ.length > 0 || diffTopic.Descriptive.length > 0) {
      differences[topic] = diffTopic;
    }
  });

  return differences;
}


export function convertDiffToArray(diffData) {
  const result = [];

  // Iterate over each topic in the difference data
  Object.keys(diffData).forEach(topic => {
    const diffTopic = diffData[topic];

    // Process MCQ questions
    diffTopic.MCQ.forEach(diffMCQ => {
      const marks = diffMCQ.Marks;
      const noOfQuestions = diffMCQ.NoOfQ;

      for (let i = 0; i < noOfQuestions; i++) {
        result.push({
          topic: topic,
          difficulty: getRandomDifficulty(),
          marks: marks,
          type: "Multiple Choice Question"
        });
      }
    });

    // Process Descriptive questions
    diffTopic.Descriptive.forEach(diffDescriptive => {
      const marks = diffDescriptive.Marks;
      const noOfQuestions = diffDescriptive.NoOfQ;

      for (let i = 0; i < noOfQuestions; i++) {
        result.push({
          topic: topic,
          difficulty: getRandomDifficulty(),
          marks: marks,
          type: "Descriptive Question"
        });
      }
    });
  });

  return result;
}

// Helper function to randomly pick difficulty
function getRandomDifficulty() {
  const difficulties = ["EASY", "MEDIUM", "HARD"];
  const randomIndex = Math.floor(Math.random() * difficulties.length);
  return difficulties[randomIndex];
}