import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const verifyAccessToken = (req, res, next) => {
  try {
    const token = req.headers['authorization'];
    console.log(req.headers);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; 
    next(); 
  } catch (error) {
    console.error(error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};