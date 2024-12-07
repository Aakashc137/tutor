import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { sequelize } from '../connections/database.js'
dotenv.config()


export const User = sequelize.define('User', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  emailId: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true, 
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  tokens: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
  },
},{
  tableName: 'Users',
  indexes: [
    { unique: true, fields: ['emailId'] }, 
    { fields: ['tokens'] },
  ],
});

User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});