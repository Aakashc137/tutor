import { Sequelize } from "sequelize";
import { sequelize } from "../connections/database.js";

export const Question = sequelize.define(
    "Question",
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
            comment:
                "The questionId of the question corresponding to the description of the question in the prompt",
        },
        type: {
            type: Sequelize.ENUM("MCQ", "Descriptive"),
            allowNull: false,
            comment: "The type of the question.",
        },
        questionText: {
            type: Sequelize.TEXT,
            allowNull: false,
            comment: "The question being asked.",
        },
        marks: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: "The marks assigned for the question.",
        },
        options: {
            type: Sequelize.JSONB,
            allowNull: true,
            comment:
                "Options for multiple choice questions. Null for descriptive questions.",
        },
        difficulty: {
            type: Sequelize.ENUM("easy", "medium", "hard"),
            allowNull: false,
            comment: "The difficulty level of the question.",
        },
    },
    {
        tableName: "Questions",
        timestamps: true,
        indexes: [
            { fields: ["type"] },
            { fields: ["difficulty"] },
            { fields: ["marks"] },
            { fields: ["updatedAt"], order: [["updatedAt", "DESC"]] },
        ],
    }
);