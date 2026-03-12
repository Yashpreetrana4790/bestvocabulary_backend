import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { getDashboardStats } from '../services/adminService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Public
 */

router.get(
  '/dashboard/stats',
  asyncHandler(async (req, res) => {
    const stats = await getDashboardStats();
    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  })
);

export default router;
