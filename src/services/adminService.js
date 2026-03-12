import User from '../models/usermodel.js';
import Word from '../models/wordmodel.js';
import Question from '../models/questionsmodel.js';
import Expression from '../models/expressionmodel.js';
import PhrasalVerb from '../models/phrasalVerbsmodel.js';
import logger from '../utils/logger.js';

/**
 * Get dashboard statistics
 * @returns {Promise<Object>} Statistics object
 */
export const getDashboardStats = async () => {
  try {
    const [
      totalUsers,
      totalWords,
      totalQuestions,
      totalExpressions,
      totalPhrasalVerbs,
    ] = await Promise.all([
      User.countDocuments(),
      Word.countDocuments(),
      Question.countDocuments(),
      Expression.countDocuments(),
      PhrasalVerb.countDocuments(),
    ]);

    return {
      totalUsers,
      totalWords,
      totalQuestions,
      totalExpressions,
      totalPhrasalVerbs,
    };
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Get public statistics (no auth required, excludes user count)
 * @returns {Promise<Object>} Public statistics object
 */
export const getPublicStats = async () => {
  try {
    const [totalWords, totalQuestions, totalExpressions, totalPhrasalVerbs] =
      await Promise.all([
        Word.countDocuments(),
        Question.countDocuments(),
        Expression.countDocuments(),
        PhrasalVerb.countDocuments(),
      ]);

    return {
      totalWords,
      totalQuestions,
      totalExpressions,
      totalPhrasalVerbs,
    };
  } catch (error) {
    logger.error('Error fetching public stats:', error);
    throw error;
  }
};

export default {
  getDashboardStats,
  getPublicStats,
};

