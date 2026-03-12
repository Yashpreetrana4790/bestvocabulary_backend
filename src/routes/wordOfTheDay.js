import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";
import { getTodayWordOfTheDay, setWordOfTheDay } from "../services/wodService.js";
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

export default router;
