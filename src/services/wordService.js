import Word from '../models/wordmodel.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Get all words with filtering and pagination
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Words and pagination info
 */
export const getAllWords = async (filters) => {
  const { page = 1, limit = 12, search, difficulty, length, startsWith } = filters;

  const difficultyMapping = {
    Beginner: ['Easy', 'Beginner'],
    Intermediate: ['Medium', 'Intermediate'],
    Advanced: ['Hard', 'Advanced'],
  };

  let query = {};
  let wordFilters = [];

  if (search) {
    wordFilters.push({ word: { $regex: search, $options: 'i' } });
  }

  if (length) {
    if (length === 'short') wordFilters.push({ word: { $regex: /^.{1,4}$/ } });
    else if (length === 'medium') wordFilters.push({ word: { $regex: /^.{5,8}$/ } });
    else if (length === 'long') wordFilters.push({ word: { $regex: /^.{9,}$/ } });
  }

  if (startsWith) {
    wordFilters.push({ word: { $regex: `^${startsWith}`, $options: 'i' } });
  }

  if (wordFilters.length > 0) {
    query.$and = wordFilters;
  }

  if (difficulty) {
    const dbDifficulties = difficultyMapping[difficulty];
    if (dbDifficulties) {
      query['meanings.difficulty'] = { $in: dbDifficulties };
    }
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 12;
  const skip = (pageNum - 1) * limitNum;

  // Get total count and paginated results
  const [words, totalCount] = await Promise.all([
    Word.find(query).skip(skip).limit(limitNum).lean(),
    Word.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    words,
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

/**
 * Get single word by word field
 * @param {string} wordText - Word text
 * @returns {Promise<Object>} Word
 */
export const getWordByText = async (wordText) => {
  const word = await Word.findOne({ word: wordText.toLowerCase() }).populate({
    path: 'synonyms antonyms expressions PhrasalVerbs questions',
    strictPopulate: false,
  });

  if (!word) {
    throw new NotFoundError('Word not found');
  }

  return word;
};

/**
 * Get random word
 * @returns {Promise<Object>} Random word
 */
export const getRandomWord = async () => {
  const ids = await Word.find({}, { _id: 1 }).lean();

  if (!ids.length) {
    throw new NotFoundError('No words found');
  }

  const randomId = ids[Math.floor(Math.random() * ids.length)]._id;

  if (!mongoose.Types.ObjectId.isValid(randomId)) {
    throw new ValidationError('Invalid ObjectId');
  }

  const randomWord = await Word.findById(randomId);

  if (!randomWord) {
    throw new NotFoundError('Word not found');
  }

  return randomWord;
};

/**
 * Update word basic fields
 * @param {string} wordId - Word ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated word
 */
export const updateWord = async (wordId, updateData) => {
  const { word, pronunciation, frequency, overall_tone, etymology, misspellings, note } = updateData;

  const updatedWord = await Word.findByIdAndUpdate(
    wordId,
    {
      word,
      pronunciation,
      frequency,
      overall_tone,
      etymology,
      note,
      misspellings,
    },
    { new: true }
  );

  if (!updatedWord) {
    throw new NotFoundError('Word not found');
  }

  logger.info(`Updated word: ${updatedWord.word}`);
  return updatedWord;
};

/**
 * Update word meanings
 * @param {string} wordId - Word ID
 * @param {Array} meanings - Meanings array
 * @returns {Promise<Object>} Updated word
 */
export const updateWordMeanings = async (wordId, meanings) => {
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(wordId)) {
    throw new ValidationError('Invalid word ID');
  }

  // Validate meanings structure
  if (!Array.isArray(meanings)) {
    throw new ValidationError('Meanings must be an array');
  }

  // Validate each meaning
  for (const [index, meaning] of meanings.entries()) {
    if (!meaning.pos || !meaning.pronunciation || !meaning.meaning) {
      throw new ValidationError(
        `Meaning at index ${index} is missing required fields (pos, pronunciation, or meaning)`
      );
    }

    // Validate common_usage
    if (meaning.common_usage && Array.isArray(meaning.common_usage)) {
      for (const [usageIndex, usage] of meaning.common_usage.entries()) {
        if (!usage.context || !usage.example) {
          throw new ValidationError(
            `Common usage at index ${usageIndex} in meaning ${index} is missing context or example`
          );
        }
      }
    }

    // Validate example_sentences
    if (meaning.example_sentences && Array.isArray(meaning.example_sentences)) {
      for (const [sentenceIndex, sentence] of meaning.example_sentences.entries()) {
        if (typeof sentence !== 'string' || !sentence.trim()) {
          throw new ValidationError(
            `Example sentence at index ${sentenceIndex} in meaning ${index} must be a non-empty string`
          );
        }
      }
    }
  }

  // Find the word
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  // Create a map of existing meanings by _id
  const existingMeaningsMap = new Map();
  word.meanings.forEach((m) => {
    if (m._id) existingMeaningsMap.set(m._id.toString(), m);
  });

  // Prepare updated meanings with proper ObjectIDs
  const updatedMeanings = meanings.map((meaning) => {
    // For existing meanings
    if (meaning._id && existingMeaningsMap.has(meaning._id)) {
      const existing = existingMeaningsMap.get(meaning._id);
      return {
        ...existing.toObject(), // Preserve existing data
        ...meaning, // Apply updates
        _id: existing._id, // Maintain original ID
      };
    }

    // For new meanings - generate new ObjectID
    return {
      ...meaning,
      _id: new mongoose.Types.ObjectId(),
    };
  });

  // Update the word
  word.meanings = updatedMeanings;
  const updatedWord = await word.save();

  logger.info(`Updated meanings for word: ${updatedWord.word}`);
  return updatedWord;
};

/**
 * Search words by term for relation management
 * @param {string} searchTerm - Search term
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Matching words
 */
export const searchWordsForRelations = async (searchTerm, limit = 20) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const words = await Word.find({
    word: { $regex: searchTerm, $options: 'i' },
  })
    .select('_id word pronunciation')
    .limit(limit)
    .lean();

  return words;
};

/**
 * Add synonym to a specific meaning
 * @param {string} wordId - Word ID
 * @param {string} meaningId - Meaning ID
 * @param {string} synonymWordId - Synonym word ID
 * @returns {Promise<Object>} Updated word
 */
export const addSynonymToMeaning = async (wordId, meaningId, synonymWordId) => {
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const meaning = word.meanings.id(meaningId);
  if (!meaning) {
    throw new NotFoundError('Meaning not found');
  }

  // Check if synonym already exists
  if (meaning.synonyms.includes(synonymWordId)) {
    throw new ValidationError('Synonym already exists in this meaning');
  }

  // Check if trying to add word to itself
  if (word._id.toString() === synonymWordId) {
    throw new ValidationError('Cannot add word as its own synonym');
  }

  // Verify synonym word exists
  const synonymWord = await Word.findById(synonymWordId);
  if (!synonymWord) {
    throw new NotFoundError('Synonym word not found');
  }

  meaning.synonyms.push(synonymWordId);
  const updatedWord = await word.save();

  logger.info(`Added synonym ${synonymWord.word} to meaning in word: ${word.word}`);
  return updatedWord;
};

/**
 * Add antonym to a specific meaning
 * @param {string} wordId - Word ID
 * @param {string} meaningId - Meaning ID
 * @param {string} antonymWordId - Antonym word ID
 * @returns {Promise<Object>} Updated word
 */
export const addAntonymToMeaning = async (wordId, meaningId, antonymWordId) => {
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const meaning = word.meanings.id(meaningId);
  if (!meaning) {
    throw new NotFoundError('Meaning not found');
  }

  // Check if antonym already exists
  if (meaning.antonyms.includes(antonymWordId)) {
    throw new ValidationError('Antonym already exists in this meaning');
  }

  // Check if trying to add word to itself
  if (word._id.toString() === antonymWordId) {
    throw new ValidationError('Cannot add word as its own antonym');
  }

  // Verify antonym word exists
  const antonymWord = await Word.findById(antonymWordId);
  if (!antonymWord) {
    throw new NotFoundError('Antonym word not found');
  }

  meaning.antonyms.push(antonymWordId);
  const updatedWord = await word.save();

  logger.info(`Added antonym ${antonymWord.word} to meaning in word: ${word.word}`);
  return updatedWord;
};

/**
 * Remove synonym from a specific meaning
 * @param {string} wordId - Word ID
 * @param {string} meaningId - Meaning ID
 * @param {string} synonymWordId - Synonym word ID
 * @returns {Promise<Object>} Updated word
 */
export const removeSynonymFromMeaning = async (wordId, meaningId, synonymWordId) => {
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const meaning = word.meanings.id(meaningId);
  if (!meaning) {
    throw new NotFoundError('Meaning not found');
  }

  meaning.synonyms.pull(synonymWordId);
  const updatedWord = await word.save();

  logger.info(`Removed synonym from meaning in word: ${word.word}`);
  return updatedWord;
};

/**
 * Remove antonym from a specific meaning
 * @param {string} wordId - Word ID
 * @param {string} meaningId - Meaning ID
 * @param {string} antonymWordId - Antonym word ID
 * @returns {Promise<Object>} Updated word
 */
export const removeAntonymFromMeaning = async (wordId, meaningId, antonymWordId) => {
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const meaning = word.meanings.id(meaningId);
  if (!meaning) {
    throw new NotFoundError('Meaning not found');
  }

  meaning.antonyms.pull(antonymWordId);
  const updatedWord = await word.save();

  logger.info(`Removed antonym from meaning in word: ${word.word}`);
  return updatedWord;
};

export default {
  getAllWords,
  getWordByText,
  getRandomWord,
  updateWord,
  updateWordMeanings,
  searchWordsForRelations,
  addSynonymToMeaning,
  addAntonymToMeaning,
  removeSynonymFromMeaning,
  removeAntonymFromMeaning,
};

