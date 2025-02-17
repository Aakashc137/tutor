import { Sequelize } from "sequelize";
import { sequelize } from "../connections/database.js";

export const Job = sequelize.define("Job", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  awsJobId: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  jobType: {
    type: Sequelize.ENUM("awsTextExtraction"),
    allowNull: false,
  },
  // The current status: inProcess, completed, or failed
  status: {
    type: Sequelize.ENUM("inProcess", "completed", "failed"),
    defaultValue: "inProcess",
  },
  // The S3 PDF URL we are extracting from
  inputUrl: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  // The S3 text file URL (once extraction is done)
  outputUrl: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  // Metadata about the job. Json object
  metadata: {
    type: Sequelize.JSON,
    allowNull: true,
  },
}, {
  tableName: "Jobs",
  timestamps: true,
});