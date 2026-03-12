import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import {
  getGoogleChatCompletion,
  generateContextualWord,
  generateWordsBatch,
  validateWordContent,
} from '../services/aiService.js';
const router = express.Router();

/**
 * @route   POST /api/v1/ai/generate-word
 * @desc    Generate complete word data using AI
 * @access  Admin
 */
router.post(
  '/generate-word',
  asyncHandler(async (req, res) => {
    const { word } = req.body;

    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Word is required',
      });
    }

    const wordData = await getGoogleChatCompletion(word);

    if (!wordData) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate word data',
      });
    }

    return successResponse(res, wordData, 'Word generated successfully');
  })
);

/**
 * @route   POST /api/v1/ai/generate-contextual-word
 * @desc    Generate word with specific context (topic, difficulty)
 * @access  Admin
 */
router.post(
  '/generate-contextual-word',
  asyncHandler(async (req, res) => {
    const { topic, difficulty, context } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required',
      });
    }

    const wordData = await generateContextualWord(topic, difficulty, context);

    if (!wordData) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate contextual word',
      });
    }

    return successResponse(res, wordData, 'Contextual word generated successfully');
  })
);

/**
 * @route   POST /api/v1/ai/generate-batch
 * @desc    Generate multiple words at once
 * @access  Admin
 */
router.post(
  '/generate-batch',
  asyncHandler(async (req, res) => {
    const { count = 5, topic, difficulty } = req.body;

    if (count > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum batch size is 20 words',
      });
    }

    const filters = {};
    if (topic) filters.topic = topic;
    if (difficulty) filters.difficulty = difficulty;

    const wordsData = await generateWordsBatch(count, filters);

    return successResponse(res, wordsData, `Generated ${wordsData.length} words successfully`);
  })
);

/**
 * @route   POST /api/v1/ai/validate-word
 * @desc    Validate word content quality using AI
 * @access  Admin
 */
router.post(
  '/validate-word',
  asyncHandler(async (req, res) => {
    const wordData = req.body;

    if (!wordData || !wordData.word) {
      return res.status(400).json({
        success: false,
        message: 'Word data is required',
      });
    }

    const validation = await validateWordContent(wordData);

    return successResponse(res, validation, 'Word validation completed');
  })
);

export default router;

