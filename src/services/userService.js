import bcrypt from 'bcryptjs';
import { generateToken } from '../config/jwt.js';
import User from '../models/usermodel.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and token
 */
export const registerUser = async (userData) => {
  const { email, fullName, password, confirmPassword } = userData;

  // Check if passwords match
  if (password !== confirmPassword) {
    throw new BadRequestError('Passwords do not match');
  }

  // Check for existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn(`Registration attempt with existing email: ${email}`);
    throw new BadRequestError('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = await User.create({
    email,
    fullName,
    password: hashedPassword,
    role: 'student',
  });

  if (!newUser) {
    throw new BadRequestError('Failed to create user');
  }

  // Generate token
  const token = generateToken({
    userId: newUser._id,
    email: newUser.email,
  });

  logger.info(`User registered successfully: ${newUser.email}`);

  return {
    user: {
      id: newUser._id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    },
    token,
  };
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @returns {Promise<Object>} User and token
 */
export const loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Failed login attempt for: ${email}`);
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate token
  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  logger.info(`User logged in successfully: ${user.email}`);

  return {
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {Object} passwordData - Old and new passwords
 * @returns {Promise<void>}
 */
export const changeUserPassword = async (userId, passwordData) => {
  const { oldPassword, newPassword } = passwordData;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid old password');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);
};

/**
 * Get all users
 * @returns {Promise<Array>} List of users
 */
export const getAllUsers = async () => {
  const users = await User.find().select('-password -__v -createdAt -updatedAt').lean();
  return users;
};

export default {
  registerUser,
  loginUser,
  changeUserPassword,
  getAllUsers,
};

