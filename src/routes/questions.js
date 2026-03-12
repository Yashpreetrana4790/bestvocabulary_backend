import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { paginatedResponse } from '../utils/apiResponse.js';
import { getAllQuestions } from '../services/questionService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/questions/allquestions
 * @desc    Get all questions with pagination
 * @access  Public
 */
router.get(
  '/allquestions',
  asyncHandler(async (req, res) => {
    const result = await getAllQuestions(req.query);
    return paginatedResponse(
      res,
      result.data,
      result.pagination,
      'Questions retrieved successfully'
    );
  })
);

export default router;
