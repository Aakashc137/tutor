import express from 'express';
import { signup, login, sendOtp, verifyOtp } from '../controllers/authController.js';
import { otpRateLimiter } from '../middlewares/otpRateLimit.middleware.js';

const authRouter = express.Router();

authRouter.post('/signup', signup);
authRouter.post('/login', login);
authRouter.post('/send-otp', otpRateLimiter, sendOtp);
authRouter.post('/verify-otp', otpRateLimiter, verifyOtp);

export default authRouter;