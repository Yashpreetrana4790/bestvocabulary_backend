import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import { getAllPhrasalVerbs, getPhrasalVerbById, createPhrasalVerb, deletePhrasalVerb } from '../services/phraseService.js';
const router = express.Router();

/**
 * @route   GET /api/v1/phrase/allphrases
 * @desc    Get all phrasal verbs with pagination and search
 * @access  Public
 */
router.get(
  '/allphrases',
  asyncHandler(async (req, res) => {
    const result = await getAllPhrasalVerbs(req.query);
    return paginatedResponse(res, result.data, result.pagination, 'Phrasal verbs retrieved successfully');
  })
);

/**
 * @route   POST /api/v1/phrase/createphrase
 * @desc    Create new phrasal verb
 * @access  Admin
 */
router.post(
  '/createphrase',
  asyncHandler(async (req, res) => {
    const newPhrasalVerb = await createPhrasalVerb(req.body);
    return successResponse(res, newPhrasalVerb, 'Phrasal verb created successfully', 201);
  })
);

/**
 * @route   GET /api/v1/phrase/phrase/:id
 * @desc    Get single phrasal verb by ID
 * @access  Public
 */
router.get(
  '/phrase/:id',
  asyncHandler(async (req, res) => {
    const phrasalVerb = await getPhrasalVerbById(req.params.id);
    return successResponse(res, phrasalVerb, 'Phrasal verb retrieved successfully');
  })
);

/**
 * @route   DELETE /api/v1/phrase/phrase/:id
 * @desc    Delete phrasal verb by ID
 * @access  Admin
 */
router.delete(
  '/phrase/:id',
  asyncHandler(async (req, res) => {
    const deletedPhrasalVerb = await deletePhrasalVerb(req.params.id);
    return successResponse(res, deletedPhrasalVerb, 'Phrasal verb deleted successfully');
  })
);

export default router;
