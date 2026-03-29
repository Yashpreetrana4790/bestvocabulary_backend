import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { getDashboardStats } from '../services/adminService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const stats = await getDashboardStats();
    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  })
);

export default router;
