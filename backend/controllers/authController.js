const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

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
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      userName: user.userName,
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

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(403).json({ message: "Refresh token expired. Please log in again." });
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

      const newRefreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d",
      });

      user.refreshToken = newRefreshToken;
      await user.save();

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
      });

      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select("userName email _id name profileImage");
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
};
