import moment from 'moment';
import cron from 'node-cron';
import Word from '../models/wordmodel.js';
import Wod from '../models/wodmodel.js';
import { NotFoundError, BadRequestError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Get today's word of the day
 * @returns {Promise<Object>} Word of the day
 */
export const getTodayWordOfTheDay = async () => {
  const wordOfTheDay = await Wod.findOne({
    date: {
      $gte: moment().startOf('day').toDate(),
      $lte: moment().endOf('day').toDate(),
    },
  }).populate({
    path: 'word',
    select: '-__v',
  });

  if (!wordOfTheDay) {
    throw new NotFoundError("Today's word of the day has not been set yet.");
  }

  return wordOfTheDay.word;
};

/**
 * Manually set word of the day
 * @param {string} wordId - Word ID
 * @returns {Promise<Object>} Created WOD entry
 */
export const setWordOfTheDay = async (wordId) => {
  // Check if word exists
  const wordExists = await Word.findById(wordId);
  if (!wordExists) {
    throw new NotFoundError('Word not found');
  }

  const today = moment().startOf('day').toISOString();

  // Check if WOD already exists for today
  const existingWod = await Wod.findOne({
    date: {
      $gte: moment().startOf('day').toDate(),
      $lte: moment().endOf('day').toDate(),
    },
  });

  if (existingWod) {
    throw new BadRequestError('Word of the day already set for today');
  }

  // Create new WOD entry
  const newWod = await Wod.create({
    word: wordId,
    date: today,
  });

  logger.info(`Word of the day set: ${wordExists.word}`);

  return {
    wodId: newWod._id,
    word: wordExists,
  };
};

/**
 * Updates the Word of the Day with a random selection
 */
const updateWordOfTheDay = async () => {
  try {
    const today = moment().startOf('day').toISOString();

    // Check if today's word is already set (query by string - schema stores date as string)
    const existingEntry = await Wod.findOne({ date: today });

    if (existingEntry) {
      logger.info('Word of the day already set for today');
      return;
    }

    // Get total count of available words
    const count = await Word.countDocuments();
    if (count === 0) {
      logger.warn('No words available in database');
      return;
    }

    // Get random word
    const randomIndex = Math.floor(Math.random() * count);
    const randomWord = await Word.findOne().skip(randomIndex).select('-__v');

    if (!randomWord) {
      logger.warn('No valid word found');
      return;
    }

    // Create new WOD entry
    await Wod.create({
      word: randomWord._id,
      date: today,
    });

    logger.info(`Word of the day updated: ${randomWord.word}`);
  } catch (error) {
    // Duplicate key = WOD for this date already exists (e.g. race or timezone mismatch)
    if (error.code === 11000) {
      logger.info('Word of the day already set for today (duplicate key)');
      return;
    }
    logger.error('Error updating word of the day:', error);
  }
};

// Schedule the function to run at midnight (00:00) every day
cron.schedule('0 0 * * *', () => {
  logger.info('Running scheduled Word of the Day update...');
  updateWordOfTheDay();
}, {
  scheduled: true,
  timezone: 'UTC',
});

// Initial update check when server starts
logger.info('Checking Word of the Day on startup...');
updateWordOfTheDay();

export default {
  getTodayWordOfTheDay,
  setWordOfTheDay,
};

