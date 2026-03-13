import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import {
  generateAndSaveEtymology,
  updateWordEtymology,
  getWordsByOrigin,
  getOriginMapData,
  addWordRelation,
  getWordRelationsGraph,
  batchGenerateEtymology,
} from '../services/etymologyService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/etymology/origin-map
 * @desc    Get origin map data - words grouped by language origins with coordinates
 * @access  Public
 */
router.get(
  '/origin-map',
  asyncHandler(async (req, res) => {
    const data = await getOriginMapData();
    return successResponse(res, data, 'Origin map data retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/etymology/by-origin/:language
 * @desc    Get words by origin language
 * @access  Public
 */
router.get(
  '/by-origin/:language',
  asyncHandler(async (req, res) => {
    const { language } = req.params;
    const { limit = 50 } = req.query;
    const words = await getWordsByOrigin(language, parseInt(limit));
    return successResponse(res, words, `Words from ${language} origin retrieved`);
  })
);

/**
 * @route   POST /api/v1/etymology/generate/:wordId
 * @desc    Generate etymology details using AI for a specific word
 * @access  Admin
 */
router.post(
  '/generate/:wordId',
  asyncHandler(async (req, res) => {
    const word = await generateAndSaveEtymology(req.params.wordId);
    return successResponse(res, word, 'Etymology generated successfully');
  })
);

/**
 * @route   PUT /api/v1/etymology/:wordId
 * @desc    Update etymology details for a word
 * @access  Admin
 */
router.put(
  '/:wordId',
  asyncHandler(async (req, res) => {
    const word = await updateWordEtymology(req.params.wordId, req.body);
    return successResponse(res, word, 'Etymology updated successfully');
  })
);

/**
 * @route   POST /api/v1/etymology/batch-generate
 * @desc    Batch generate etymology for words without it
 * @access  Admin
 */
router.post(
  '/batch-generate',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.body;
    const results = await batchGenerateEtymology(parseInt(limit));
    return successResponse(res, results, 'Batch etymology generation completed');
  })
);

/**
 * @route   POST /api/v1/etymology/relation
 * @desc    Add word relation between two words
 * @access  Admin
 */
router.post(
  '/relation',
  asyncHandler(async (req, res) => {
    const { wordId, relatedWordId, relationStrength } = req.body;
    
    if (!wordId || !relatedWordId) {
      return res.status(400).json({
        success: false,
        message: 'wordId and relatedWordId are required'
      });
    }

    const word = await addWordRelation(wordId, relatedWordId, relationStrength);
    return successResponse(res, word, 'Word relation added successfully');
  })
);

/**
 * @route   GET /api/v1/etymology/relations/:wordId
 * @desc    Get word relations graph
 * @access  Public
 */
router.get(
  '/relations/:wordId',
  asyncHandler(async (req, res) => {
    const { depth = 2 } = req.query;
    const graph = await getWordRelationsGraph(req.params.wordId, parseInt(depth));
    return successResponse(res, graph, 'Word relations graph retrieved');
  })
);

export default router;
