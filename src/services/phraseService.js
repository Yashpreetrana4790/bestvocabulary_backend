import PhrasalVerb from '../models/phrasalVerbsmodel.js';
import { NotFoundError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { escapeRegex } from '../utils/helpers.js';

/**
 * Get all phrasal verbs with pagination and search
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Phrasal verbs and pagination info
 */
export const getAllPhrasalVerbs = async (filters) => {
  const { page = 1, limit = 20, search = '' } = filters;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Validate inputs
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new Error('Invalid pagination parameters. Page must be ≥1, limit between 1-100');
  }

  // Build search filter
  const filter = {};
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'gi');
    filter.$or = [
      { phrase: searchRegex },
      { meaning: searchRegex },
    ];
  }

  // Execute queries in parallel
  const [phrases, totalCount] = await Promise.all([
    PhrasalVerb.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .lean(),
    PhrasalVerb.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    data: phrases,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    search: {
      query: search,
      resultsCount: phrases.length,
    },
  };
};

/**
 * Get single phrasal verb by ID
 * @param {string} id - Phrasal verb ID
 * @returns {Promise<Object>} Phrasal verb
 */
export const getPhrasalVerbById = async (id) => {
  const phrasalVerb = await PhrasalVerb.findById(id);
  if (!phrasalVerb) {
    throw new NotFoundError('Phrasal verb not found');
  }
  return phrasalVerb;
};

/**
 * Create new phrasal verb
 * @param {Object} data - Phrasal verb data
 * @returns {Promise<Object>} Created phrasal verb
 */
export const createPhrasalVerb = async (data) => {
  const newPhrasalVerb = await PhrasalVerb.create(data);
  logger.info(`Created phrasal verb: ${newPhrasalVerb.phrase}`);
  return newPhrasalVerb;
};

/**
 * Delete phrasal verb by ID
 * @param {string} id - Phrasal verb ID
 * @returns {Promise<Object>} Deleted phrasal verb
 */
export const deletePhrasalVerb = async (id) => {
  const deletedPhrasalVerb = await PhrasalVerb.findByIdAndDelete(id);
  if (!deletedPhrasalVerb) {
    throw new NotFoundError('Phrasal verb not found');
  }
  logger.info(`Deleted phrasal verb: ${deletedPhrasalVerb.phrase}`);
  return deletedPhrasalVerb;
};

export default {
  getAllPhrasalVerbs,
  getPhrasalVerbById,
  createPhrasalVerb,
  deletePhrasalVerb,
};

