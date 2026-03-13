import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import {
  getAllWords,
  getWordByText,
  getRandomWord,
  updateWord,
  updateWordMeanings,
  searchWordsForRelations,
  semanticSearch,
  ensureWordEmbedding,
  backfillEmbeddings,
  addSynonymToMeaning,
  addAntonymToMeaning,
  removeSynonymFromMeaning,
  removeAntonymFromMeaning,
} from '../services/wordService.js';
const router = express.Router();

/**
 * @route   GET /api/v1/words/words
 * @desc    Get all words with filtering and pagination
 * @access  Public
 */
router.get(
  '/words',
  asyncHandler(async (req, res) => {
    const result = await getAllWords(req.query);
    return successResponse(res, result, 'Words retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/words/random
 * @desc    Get random word
 * @access  Public
 */
router.get(
  '/random',
  asyncHandler(async (req, res) => {
    const word = await getRandomWord();
    return successResponse(res, word, 'Random word retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/words/words/:word
 * @desc    Get single word by word text
 * @access  Public
 */
router.get(
  '/words/:word',
  asyncHandler(async (req, res) => {
    const word = await getWordByText(req.params.word);
    return successResponse(res, word, 'Word retrieved successfully');
  })
);

/**
 * @route   PUT /api/v1/words/word/:id
 * @desc    Update word basic fields
 * @access  Admin
 */
router.put(
  '/word/:id',
  asyncHandler(async (req, res) => {
    const updatedWord = await updateWord(req.params.id, req.body);
    return successResponse(res, updatedWord, 'Word updated successfully');
  })
);

/**
 * @route   PUT /api/v1/words/words/:id/meanings
 * @desc    Update word meanings
 * @access  Admin
 */
router.put(
  '/words/:id/meanings',
  asyncHandler(async (req, res) => {
    const updatedWord = await updateWordMeanings(req.params.id, req.body.meanings);
    return successResponse(res, updatedWord, 'Meanings updated successfully');
  })
);

/**
 * @route   GET /api/v1/words/search
 * @desc    Search words for relation management
 * @access  Admin
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q, limit = 20 } = req.query;
    const words = await searchWordsForRelations(q, limit);
    return successResponse(res, words, 'Search completed successfully');
  })
);

/**
 * @route   GET /api/v1/words/semantic-search
 * @desc    Semantic search using AI embeddings (query by meaning). Requires embeddings backfill.
 * @access  Public
 */
router.get(
  '/semantic-search',
  asyncHandler(async (req, res) => {
    const { q, limit = 10 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const results = await semanticSearch(q, limitNum);
    return successResponse(res, results, 'Semantic search completed');
  })
);

/**
 * @route   POST /api/v1/words/backfill-embedding/:wordId
 * @desc    Generate and save embedding for one word (for semantic search). Admin / internal.
 * @access  Public (consider protecting in production)
 */
router.post(
  '/backfill-embedding/:wordId',
  asyncHandler(async (req, res) => {
    const updated = await ensureWordEmbedding(req.params.wordId);
    return successResponse(res, updated, updated ? 'Embedding saved' : 'Embedding not generated');
  })
);

/**
 * @route   POST /api/v1/words/backfill-embeddings
 * @desc    Backfill embeddings for words that don't have one (body: { limit?: number }).
 * @access  Public (consider protecting in production)
 */
router.post(
  '/backfill-embeddings',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.body?.limit, 10) || 20, 100);
    const result = await backfillEmbeddings(limit);
    return successResponse(res, result, 'Backfill completed');
  })
);

/**
 * @route   POST /api/v1/words/:wordId/meanings/:meaningId/synonyms
 * @desc    Add synonym to a meaning
 * @access  Admin
 */
router.post(
  '/:wordId/meanings/:meaningId/synonyms',
  asyncHandler(async (req, res) => {
    const { wordId, meaningId } = req.params;
    const { synonymWordId } = req.body;

    if (!synonymWordId) {
      return res.status(400).json({
        success: false,
        message: 'synonymWordId is required',
      });
    }

    const updatedWord = await addSynonymToMeaning(wordId, meaningId, synonymWordId);
    return successResponse(res, updatedWord, 'Synonym added successfully');
  })
);

/**
 * @route   POST /api/v1/words/:wordId/meanings/:meaningId/antonyms
 * @desc    Add antonym to a meaning
 * @access  Admin
 */
router.post(
  '/:wordId/meanings/:meaningId/antonyms',
  asyncHandler(async (req, res) => {
    const { wordId, meaningId } = req.params;
    const { antonymWordId } = req.body;

    if (!antonymWordId) {
      return res.status(400).json({
        success: false,
        message: 'antonymWordId is required',
      });
    }

    const updatedWord = await addAntonymToMeaning(wordId, meaningId, antonymWordId);
    return successResponse(res, updatedWord, 'Antonym added successfully');
  })
);

/**
 * @route   DELETE /api/v1/words/:wordId/meanings/:meaningId/synonyms/:synonymWordId
 * @desc    Remove synonym from a meaning
 * @access  Admin
 */
router.delete(
  '/:wordId/meanings/:meaningId/synonyms/:synonymWordId',
  asyncHandler(async (req, res) => {
    const { wordId, meaningId, synonymWordId } = req.params;
    const updatedWord = await removeSynonymFromMeaning(wordId, meaningId, synonymWordId);
    return successResponse(res, updatedWord, 'Synonym removed successfully');
  })
);

/**
 * @route   DELETE /api/v1/words/:wordId/meanings/:meaningId/antonyms/:antonymWordId
 * @desc    Remove antonym from a meaning
 * @access  Admin
 */
router.delete(
  '/:wordId/meanings/:meaningId/antonyms/:antonymWordId',
  asyncHandler(async (req, res) => {
    const { wordId, meaningId, antonymWordId } = req.params;
    const updatedWord = await removeAntonymFromMeaning(wordId, meaningId, antonymWordId);
    return successResponse(res, updatedWord, 'Antonym removed successfully');
  })
);

export default router;
