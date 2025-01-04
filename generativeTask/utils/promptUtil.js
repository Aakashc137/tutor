export const USER_PROMPT_GENERATE_QUESTION_PAPER = (config) => {
    return `You are given JSON data in the following format:
[
  {
     "type",
      "questionId",
      "question",
      "marks",
      "options",
      "difficulty",
      "topic",
      "correctAnswer",
      "calculationSteps",
      "section",
      "questionNumber"
  }    
] 
  **Task**: 
  1. From the above JSON data, produce exactly two **HTML documents** (as plain text output, not as code blocks):
     - **Document 1 (Question Paper)**: 
       - Has a proper HTML structure (<!DOCTYPE html>, <html>, <head>, <body>).
       - Contains all MCQ questions in an ordered list and descriptive questions in an ordered list (<ol>). 
       - All questions with the same section should be grouped together.
       - Number the questions according to the field questionNumber
       - Use an appropriate heading for each section (e.g., "Section A", "Section B").
       - For each question, show:
         - The questionNumber and text (e.g., "Question 1. Evaluate the limit ...").
         - In case of a Multiple Choice Question, All the multiple-choice options (A, B, C, D).
       - **Do not** show the correct answer or explanation in this first document.
  
     - **Document 2 (Answer Key)**:
       - Also has a valid HTML structure.
       - Again uses an ordered list for each question.
       - For each question, show:
         - The question number and text.
         - The **correct answer** (e.g., "Correct answer: B").
         - The **calculationSteps** (if any) from the JSON ("calculationSteps: ...").
  
  2. Make sure the HTML is neatly formatted and self-contained. Return these two HTML documents one after the other in your response, with **no additional explanation**, **no code fences**, and **no markup** beyond the HTML itself.
  3. Convert **all** LaTeX expressions (e.g., \\( ... \\), \\[ ... \\]) into suitable **MathML** (or HTML that clearly formats subscripts, superscripts, fractions, etc.) so we can generate a PDF directly from the HTML. Do **not** rely on external libraries like MathJax. 
  4. Attaching the data here :- \`\`\`json\n${config}\`\`\`
  
  
  **Important**: 
  - Do **not** provide any code or function definitions. 
  - The number of questions in each html document should match the number of input questions.
  - Do not respond with half-completed HTML documents.
  - Only output the **two complete HTML documents** (Document 1 = Question Paper, Document 2 = Answer Key). 
  - Each document should be fully self-contained, starting with <!DOCTYPE html> and ending with </html>.
  - That is all. 
  `;
  };