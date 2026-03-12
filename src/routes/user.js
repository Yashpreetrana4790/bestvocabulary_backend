import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
} from '../validators/userValidators.js';
import {
  registerUser,
  loginUser,
  changeUserPassword,
  getAllUsers,
} from '../services/userService.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/v1/user/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const validation = validateRegister(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors,
      });
    }

    const result = await registerUser(req.body);
    return successResponse(res, result, 'User created successfully', 201);
  })
);

/**
 * @route   POST /api/v1/user/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const validation = validateLogin(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const result = await loginUser(req.body);
    return successResponse(res, result, 'Login successful');
  })
);

/**
 * @route   POST /api/v1/user/change-password
 * @desc    Change user password (pass userId in body when auth is disabled)
 * @access  Public
 */
router.post(
  '/change-password',
  asyncHandler(async (req, res) => {
    const validation = validateChangePassword(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
    }
    await changeUserPassword(userId, req.body);
    return successResponse(res, null, 'Password changed successfully');
  })
);

/**
 * @route   GET /api/v1/user/allusers
 * @desc    Get all users
 * @access  Public
 */
router.get(
  '/allusers',
  asyncHandler(async (req, res) => {
    const users = await getAllUsers();
    return successResponse(res, users, 'Users retrieved successfully');
  })
);

export default router;
