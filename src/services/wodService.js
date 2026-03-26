import cron from 'node-cron';
import Word from '../models/wordmodel.js';
import Wod from '../models/wodmodel.js';
import { NotFoundError, BadRequestError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Get start of today (midnight) in UTC
 */
const getStartOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Get end of today (23:59:59.999) in UTC
 */
const getEndOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
};

/**
 * Get today's word of the day
 * @returns {Promise<Object>} Word of the day
 */
export const getTodayWordOfTheDay = async () => {
  const startOfDay = getStartOfToday();
  const endOfDay = getEndOfToday();

  let wordOfTheDay = await Wod.findOne({
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  }).populate({
    path: 'word',
    select: '-__v',
  });

  // If no WOD for today, create one automatically
  if (!wordOfTheDay) {
    logger.info('No word of the day found, creating one...');
    const created = await createRandomWordOfTheDay();
    if (created) {
      wordOfTheDay = await Wod.findById(created._id).populate({
        path: 'word',
        select: '-__v',
      });
    }
  }

  if (!wordOfTheDay || !wordOfTheDay.word) {
    throw new NotFoundError("Could not retrieve or create today's word of the day.");
  }

  return wordOfTheDay.word;
};

/**
 * Manually set word of the day
 * @param {string} wordId - Word ID
 * @returns {Promise<Object>} Created WOD entry
 */
export const setWordOfTheDay = async (wordId) => {
  const wordExists = await Word.findById(wordId);
  if (!wordExists) {
    throw new NotFoundError('Word not found');
  }

  const startOfDay = getStartOfToday();
  const endOfDay = getEndOfToday();

  const existingWod = await Wod.findOne({
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (existingWod) {
    // Update existing entry instead of throwing error
    existingWod.word = wordId;
    await existingWod.save();
    logger.info(`Word of the day updated: ${wordExists.word}`);
    return {
      wodId: existingWod._id,
      word: wordExists,
      updated: true,
    };
  }

  const newWod = await Wod.create({
    word: wordId,
    date: startOfDay,
  });

  logger.info(`Word of the day set: ${wordExists.word}`);

  return {
    wodId: newWod._id,
    word: wordExists,
    updated: false,
  };
};

/**
 * Create a random word of the day for today
 * @returns {Promise<Object|null>} Created WOD entry or null
 */
const createRandomWordOfTheDay = async () => {
  try {
    const startOfDay = getStartOfToday();
    const endOfDay = getEndOfToday();

    // Check if today's word is already set
    const existingEntry = await Wod.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingEntry) {
      logger.info('Word of the day already set for today');
      return existingEntry;
    }

    // Get ALL word IDs that have ever been used as WOD (never repeat)
    const allPreviousWods = await Wod.find({}).select('word');
    const usedWordIds = allPreviousWods.map(w => w.word);

    // Get a random word that has NEVER been used as WOD
    const count = await Word.countDocuments({ _id: { $nin: usedWordIds } });
    
    if (count === 0) {
      // All words have been used - log warning but don't repeat
      logger.warn('All words have been used as Word of the Day! No new words available.');
      logger.warn(`Total words: ${await Word.countDocuments()}, Used as WOD: ${usedWordIds.length}`);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const randomWord = await Word.findOne({ _id: { $nin: usedWordIds } })
      .skip(randomIndex)
      .select('_id word');

    if (!randomWord) {
      logger.warn('No valid word found');
      return null;
    }

    const newWod = await Wod.create({
      word: randomWord._id,
      date: startOfDay,
    });

    logger.info(`Word of the day created: ${randomWord.word}`);
    return newWod;
  } catch (error) {
    if (error.code === 11000) {
      logger.info('Word of the day already set for today (duplicate key)');
      const startOfDay = getStartOfToday();
      const endOfDay = getEndOfToday();
      return await Wod.findOne({
        date: { $gte: startOfDay, $lte: endOfDay }
      });
    }
    logger.error('Error creating word of the day:', error);
    return null;
  }
};

/**
 * Get WOD history
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>} Array of WOD entries
 */
export const getWodHistory = async (limit = 7) => {
  // Return unique calendar days (UTC), even if legacy duplicate rows exist.
  const history = await Wod.aggregate([
    { $sort: { date: -1, createdAt: -1 } },
    {
      $group: {
        _id: {
          $dateToString: {
            date: '$date',
            format: '%Y-%m-%d',
            timezone: 'UTC',
          },
        },
        entryId: { $first: '$_id' },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: limit },
  ]);

  const orderedIds = history.map((h) => h.entryId);
  if (!orderedIds.length) return [];

  const docs = await Wod.find({ _id: { $in: orderedIds } })
    .populate({
      path: 'word',
      select: 'word pronunciation meanings.subtitle meanings.easyMeaning',
    })
    .lean();

  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return orderedIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean);
};

/**
 * Clean up duplicate WOD entries - keeps only the latest entry per day
 * @returns {Promise<Object>} Cleanup result
 */
export const cleanupDuplicateWods = async () => {
  try {
    const allWods = await Wod.find().sort({ date: -1 });
    
    const seenDates = new Map();
    const toDelete = [];
    
    for (const wod of allWods) {
      // Normalize to date string (YYYY-MM-DD)
      const dateStr = wod.date.toISOString().split('T')[0];
      
      if (seenDates.has(dateStr)) {
        // Duplicate - mark for deletion
        toDelete.push(wod._id);
      } else {
        seenDates.set(dateStr, wod._id);
      }
    }
    
    if (toDelete.length > 0) {
      await Wod.deleteMany({ _id: { $in: toDelete } });
      logger.info(`Cleaned up ${toDelete.length} duplicate WOD entries`);
    }
    
    return {
      totalEntries: allWods.length,
      duplicatesRemoved: toDelete.length,
      uniqueDays: seenDates.size,
    };
  } catch (error) {
    logger.error('Error cleaning up WOD duplicates:', error);
    throw error;
  }
};

/**
 * Initialize WOD service - called on server startup
 */
export const initializeWodService = () => {
  // Schedule the function to run at midnight (00:00) UTC every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled Word of the Day update...');
    await createRandomWordOfTheDay();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  // Check/create WOD on startup
  logger.info('Checking Word of the Day on startup...');
  createRandomWordOfTheDay().catch(err => {
    logger.error('Failed to create WOD on startup:', err);
  });
};

/**
 * Delete all WOD entries (reset history)
 * @returns {Promise<Object>} Deletion result
 */
export const clearAllWodHistory = async () => {
  try {
    const count = await Wod.countDocuments();
    await Wod.deleteMany({});
    logger.info(`Deleted all ${count} WOD entries`);
    return { deletedCount: count };
  } catch (error) {
    logger.error('Error clearing WOD history:', error);
    throw error;
  }
};

export default {
  getTodayWordOfTheDay,
  setWordOfTheDay,
  getWodHistory,
  initializeWodService,
  cleanupDuplicateWods,
  clearAllWodHistory,
};
