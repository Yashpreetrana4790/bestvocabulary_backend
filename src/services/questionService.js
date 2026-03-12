import Question from '../models/questionsmodel.js';
import logger from '../utils/logger.js';

/**
 * Get all questions with pagination
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Questions and pagination info
 */
export const getAllQuestions = async (filters) => {
  const { page = 1, limit = 12 } = filters;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 12;
  const skip = (pageNum - 1) * limitNum;

  // Execute queries in parallel
  const [questions, totalCount] = await Promise.all([
    Question.find().skip(skip).limit(limitNum).lean(),
    Question.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    data: questions,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

export default {
  getAllQuestions,
};

