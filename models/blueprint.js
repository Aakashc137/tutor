import { Sequelize } from 'sequelize';
import { sequelize } from '../connections/database.js';

export const Blueprint = sequelize.define(
  'Blueprint',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    grade: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    subject: {
      type: Sequelize.ENUM('Maths', 'Science', 'English'), // Add more subjects as needed
      allowNull: false,
    },
    totalMarks: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    breakdown: {
      type: Sequelize.JSON,
      allowNull: false,
    },
  },
  {
    tableName: 'Blueprints',
    indexes: [
      { fields: ['name'] },
      { fields: ['grade'] },
      { fields: ['subject'] },
      { fields: ['totalMarks'] },
    ],
  }
);
