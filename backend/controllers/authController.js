const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const register = async (req, res) => {
  const { name, userName, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    user = new User({ name, userName, email, password });
    await user.save();

    // console.log(user);

    const payload = {
      user: {
        userName: user.userName,
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        interests: user.interests,
        role: "user",
        subscription: user.subscription,
      },
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
    });

    res.status(201).json({ accessToken, message: "Registration Successful" });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        message: "Invalid credentials",
        error: "Email or password mismatch",
      });

    const payload = {
      user: {
        userName: user.userName,
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        role: user.role,
        interests: user.interests,
        subscription: user.subscription,
      },
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
    });

    res.status(201).json({ accessToken });
  } catch (error) {
    // console.error(err.message);
    res.status(500).json({ error: "Invalid Crediantials" });
  }
};

const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  try {
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res
      .clearCookie("refreshToken")
      .json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  const { name, email, profileImage } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, profileImage },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedData = {
      userName: user.userName,
      _id: user._id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
      interests: user.interests,
      subscription: user.subscription,
    };

    res.status(201).json(updatedData);
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: "Server Error",
      error: error.response?.data || error.message,
    });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ message: "Forbidden" });

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decoded) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res
              .status(403)
              .json({ message: "Refresh token expired. Please log in again." });
          }
          return res.status(403).json({ message: "Invalid refresh token" });
        }

        const payload = {
          user: {
            userName: user.userName,
            id: user._id,
            email: user.email,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            interests: user.interests,
            subscription: user.subscription,
          },
        };

        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: "15m",
        });

        const newRefreshToken = jwt.sign(
          payload,
          process.env.JWT_REFRESH_SECRET,
          {
            expiresIn: "7d",
          }
        );

        user.refreshToken = newRefreshToken;
        await user.save();

        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
        });

        res.json({ accessToken: newAccessToken });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select(
      "userName email _id name profileImage"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    // console.error(err.message);
    res.status(500).json({
      message: "Server Error",
      error: err.response?.data || err.message,
    });
  }
};

const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Both old and new passwords are required." });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcryptjs.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Old password is not correct" });

    user.password = newPassword;
    await user.save();

    res.status(201).json({ message: "Password updated successfully" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: "Server Error",
      error: error.response?.data || error.message,
    });
  }
};

const getAllUser = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({ users, totalPages, currentPage: page });
  } catch (err) {
    // console.error(err.message);
    res.status(400).json({
      message: "Server Error",
      error: err.response?.data || err.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    const { userId, role } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();
    return res.status(200).json({ message: "User role updated" });
  } catch (err) {
    res.status(400).json({
      message: "Server Error",
      error: err.response?.data || err.message,
    });
  }
};

const createUserByAdmin = async (req, res) => {
  const { name, userName, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    user = new User({ name, userName, email, password, role });
    await user.save();

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const resetPasswordByAdmin = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTPEmail = async (email, otp, name) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - FutureBlog</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Password Reset</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your OTP for password reset</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">You have requested to reset your password. Please use the following OTP to proceed:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1f2937; margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${otp}</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">This OTP is valid for 10 minutes</p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The FutureBlog Team</p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"FutureBlog" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: "Password Reset OTP - FutureBlog",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    const otp = generateOTP();
    
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailSent = await sendOTPEmail(email, otp, user.name);
    
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
    }

    res.status(200).json({ 
      message: "OTP sent to your email address",
      email: email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ 
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ 
      message: "OTP verified successfully",
      email: email
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const user = await User.findOne({ 
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ 
      message: "Password reset successfully. Please login with your new password."
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  refresh,
  login,
  logout,
  update,
  getUserById,
  updatePassword,
  getAllUser,
  updateUserRole,
  createUserByAdmin,
  resetPasswordByAdmin,
  forgotPassword,
  verifyOTP,
  resetPasswordWithOTP,
};
