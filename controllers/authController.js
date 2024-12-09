import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/user.js';

export const signup = async (req, res) => {
  try {
    const { name, emailId, password, tokens } = req.body;

    const existingUser = await User.findOne({ where: { emailId } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered',
      });
    }

    const user = await User.create({ name, emailId, password, tokens });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        emailId: user.emailId,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

export const login = async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ where: { emailId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isAuthenticated = await bcrypt.compare(password, user.password);
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, emailId: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      userId: user.id
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};