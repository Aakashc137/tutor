export const DUMMY_MATH_QUESTION_PAPER = {
  sections: [
    {
      name: "A",
      sectionNumberOfQuestions: 20,
      sectionMarks: 1,
      sectionTotalMarks: 20,
      questions: [
        {
          questionNumber: 1,
          question:
            "Which of the following is a function?\n$y = 3x + 2$,\n$x^2 + y^2 = 1$,\n$y^2 = x + 1$,\n$x = y^2 + 2y$",
          isMCQ: true,
          options: [
            { key: "A", option: "$y = 3x + 2$" },
            { key: "B", option: "$x^2 + y^2 = 1$" },
            { key: "C", option: "$y^2 = x + 1$" },
            { key: "D", option: "$x = y^2 + 2y$" },
          ],
        },
        {
          questionNumber: 2,
          question:
            "What is the determinant of the matrix \n$\\begin{bmatrix} 2 & 3 \\\\ 4 & 5 \\end{bmatrix}$?",
          isMCQ: true,
          options: [
            { key: "A", option: "$-2$" },
            { key: "B", option: "$-1$" },
            { key: "C", option: "$1$" },
            { key: "D", option: "$2$" },
          ],
        },
        {
          questionNumber: 3,
          question: "Evaluate the integral: $\\int x^2 dx$",
          isMCQ: true,
          options: [
            { key: "A", option: "$\\frac{x^3}{3} + C$" },
            { key: "B", option: "$x^3 + C$" },
            { key: "C", option: "$2x^3 + C$" },
            { key: "D", option: "$\\frac{x^2}{2} + C$" },
          ],
        },
        {
          questionNumber: 4,
          question:
            "Which of the following quadratic equations has two distinct real roots?",
          isMCQ: true,
          options: [
            { key: "A", option: "$x^2 - 5x + 6 = 0$" },
            { key: "B", option: "$x^2 + 4x + 5 = 0$" },
            { key: "C", option: "$x^2 + 2x + 1 = 0$" },
            { key: "D", option: "$x^2 - 4x + 4 = 0$" },
          ],
        },
        {
          questionNumber: 5,
          question:
            "Find the area of a triangle with base 6 cm and height 9 cm.",
          isMCQ: true,
          options: [
            { key: "A", option: "$27 cm^2$" },
            { key: "B", option: "$36 cm^2$" },
            { key: "C", option: "$18 cm^2$" },
            { key: "D", option: "$54 cm^2$" },
          ],
        },
      ],
    },
  ],
  grade: 12,
  academyName: "Surya School",
  totalMarks: "20",
  subject: "Maths",
  timeDuration: "1 Hour",
};

export const DUMMY_MATH_SOLUTION_PAPER = {
  sections: [
    {
      name: "A",
      sectionNumberOfQuestions: 20,
      sectionMarks: 1,
      sectionTotalMarks: 20,
      questions: [
        {
          questionNumber: 1,
          question:
            "Which of the following is a function?\n$y = 3x + 2$,\n$x^2 + y^2 = 1$,\n$y^2 = x + 1$,\n$x = y^2 + 2y$",
          isMCQ: true,
          correctAnswer: "A",
          correctAnswerLabel: "A",
          correctAnswerOption: "$y = 3x + 2$",
        },
        {
          questionNumber: 2,
          question:
            "What is the determinant of the matrix \n$\\begin{bmatrix} 2 & 3 \\\\ 4 & 5 \\end{bmatrix}$?",
          isMCQ: true,
          correctAnswer: "A",
          correctAnswerLabel: "A",
          correctAnswerOption: "$-2$",
        },
        {
          questionNumber: 3,
          question: "Evaluate the integral: $\\int x^2 dx$",
          isMCQ: true,
          correctAnswer: "A",
          correctAnswerLabel: "A",
          correctAnswerOption: "$\\frac{x^3}{3} + C$",
        },
        {
          questionNumber: 4,
          question:
            "Which of the following quadratic equations has two distinct real roots?",
          isMCQ: true,
          correctAnswer: "A",
          correctAnswerLabel: "A",
          correctAnswerOption: "$x^2 - 5x + 6 = 0$",
        },
        {
          questionNumber: 5,
          question:
            "Find the area of a triangle with base 6 cm and height 9 cm.",
          isMCQ: true,
          correctAnswer: "A",
          correctAnswerLabel: "A",
          correctAnswerOption: "$27 cm^2$",
        },
      ],
    },
  ],
  grade: 12,
  academyName: "Surya School",
  totalMarks: "20",
  subject: "Maths",
  timeDuration: "1 Hour",
};
