import dotenv from 'dotenv';
import express from 'express';
import { Sequelize } from 'sequelize';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
  }
});

app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await testDatabaseConnection(); 

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();