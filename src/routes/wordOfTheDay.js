import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { getTodayWordOfTheDay, setWordOfTheDay, getWodHistory, cleanupDuplicateWods, clearAllWodHistory } from "../services/wodService.js";
import { validateMongoObjectId } from "../validators/wordValidators.js";

const router = express.Router();

/**
 * @route   GET /api/v1/word-of-the-day
 * @desc    Get today's word of the day
 * @access  Public
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const word = await getTodayWordOfTheDay();
    return successResponse(res, word, "Word of the day retrieved successfully");
  })
);

/**
 * @route   GET /api/v1/word-of-the-day/history
 * @desc    Get word of the day history
 * @access  Public
 */
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 7;
    const history = await getWodHistory(Math.min(limit, 30));
    return successResponse(res, history, "Word of the day history retrieved successfully");
  })
);

/**
 * @route   POST /api/v1/word-of-the-day/manual
 * @desc    Manually set word of the day (admin only)
 * @access  Admin
 */
router.post(
  "/manual",
  asyncHandler(async (req, res) => {
    const { wordId } = req.body;

    // Validate input
    if (!wordId || !validateMongoObjectId(wordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid word ID provided",
      });
    }

    const result = await setWordOfTheDay(wordId);
    return successResponse(res, result, "Word of the day set successfully", 201);
  })
);

/**
 * @route   POST /api/v1/word-of-the-day/cleanup
 * @desc    Clean up duplicate WOD entries (admin only)
 * @access  Admin
 */
router.post(
  "/cleanup",
  asyncHandler(async (req, res) => {
    const result = await cleanupDuplicateWods();
    return successResponse(res, result, "Duplicate WOD entries cleaned up successfully");
  })
);

/**
 * @route   DELETE /api/v1/word-of-the-day/clear
 * @desc    Delete all WOD history entries (admin only)
 * @access  Admin
 */
router.delete(
  "/clear",
  asyncHandler(async (req, res) => {
    const result = await clearAllWodHistory();
    return successResponse(res, result, "All WOD history cleared successfully");
  })
);

export default router;
