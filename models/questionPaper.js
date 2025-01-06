import { Sequelize } from 'sequelize';
import { sequelize } from '../connections/database.js';

export const QuestionPaper = sequelize.define(
  'QuestionPaper',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    grade: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    topics: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },
    subject: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    questionPaperLink: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    solutionLink: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'inProgress',
    },
  },
  {
    tableName: 'QuestionPapers',
    indexes: [
      { fields: ['name'] },
      { fields: ['grade'] },
      { fields: ['subject'] },
      { fields: ['topics'] },
    ],
  }
);
