import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/user.js";

export const signup = async (req, res) => {
  try {
    const { name, emailId, password, tokens } = req.body;

    const existingUser = await User.findOne({ where: { emailId } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const user = await User.create({ name, emailId, password, tokens });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        emailId: user.emailId,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
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
        message: "User not found",
      });
    }

    const isAuthenticated = await bcrypt.compare(password, user.password);
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, emailId: user.emailId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      userId: user.id,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

export const sendOtp = async (req, res) => {
  try {
    const { countryCode, mobileNumber } = req.body;

    if (!countryCode || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Country code and mobile number are required",
      });
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);
    console.log(otp,hashedOtp)
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    otpExpiresAt.setMinutes(
      otpExpiresAt.getMinutes() - otpExpiresAt.getTimezoneOffset()
    );

    const response = true;

    if (response) {
      let user = await User.findOne({ where: { mobileNumber } });
      const isUserOnboarded = user ? true : false;
      if (!user) {
        user = await User.create({
          countryCode,
          mobileNumber,
          currentOtp: hashedOtp,
          currentOtpExpiresAt: otpExpiresAt,
        });
      } else {
        user.currentOtp = hashedOtp;
        user.currentOtpExpiresAt = otpExpiresAt;
        await user.save();
      }
      res.status(200).json({ success: true, message: "OTP sent successfully" });
    } else {
      res.status(200).json({
        success: true,
        message: "Failed to send OTP: Unexpected response from Plivo",
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    const errorCode = error.code === "400" ? 400 : 500;
    res.status(errorCode).json({
      success: false,
      message: `Failed to send OTP: ${error.message}`,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { countryCode, mobileNumber, otp } = req.body;

    if (!countryCode || !mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Country code, mobile number, and OTP are required",
      });
    }

    const user = await User.findOne({ where: { countryCode, mobileNumber } });

    if (
      !user ||
      !user.currentOtpExpiresAt ||
      new Date(Date.now()) > new Date(user.currentOtpExpiresAt)
    ) {
      return res
        .status(401)
        .json({ success: false, message: "OTP has expired or is invalid" });
    }

    const isOtpValid = await bcrypt.compare(otp, user.currentOtp);

    if (!isOtpValid) {
      return res
        .status(401)
        .json({ success: false, message: "OTP has expired or is invalid" });
    }

    user.currentOtp = null;
    user.currentOtpExpiresAt = null;
    await user.save();

    const accessToken = jwt.sign(
      { id: user.id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        emailId: user.emailId,
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};
