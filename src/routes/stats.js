import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { getPublicStats } from '../services/adminService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/stats
 * @desc    Get public statistics (no auth required)
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const stats = await getPublicStats();
    return successResponse(res, stats, 'Stats retrieved successfully');
  })
);

export default router;
