import Word from '../models/wordmodel.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { getEmbedding, getEmbeddings } from './embeddingService.js';

const normalizeWord = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/**
 * Get all words with filtering and pagination
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Words and pagination info
 */
export const getAllWords = async (filters) => {
  const { 
    page = 1, 
    limit = 12, 
    search, 
    difficulty, 
    length, 
    startsWith,
    category,
    pos,
    tone,
    hasEtymology,
    hasPhrases,
    frequency,
    sortBy = 'word',
    sortOrder = 'asc'
  } = filters;

  const difficultyMapping = {
    Beginner: ['Easy', 'Beginner'],
    Intermediate: ['Medium', 'Intermediate'],
    Advanced: ['Hard', 'Advanced'],
    Easy: ['Easy', 'Beginner'],
    Medium: ['Medium', 'Intermediate'],
    Hard: ['Hard', 'Advanced'],
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

  if (category) {
    query['meanings.category'] = { $regex: category, $options: 'i' };
  }

  if (pos) {
    query['meanings.pos'] = { $regex: pos, $options: 'i' };
  }

  if (tone) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { overallTone: { $regex: tone, $options: 'i' } },
        { overall_tone: { $regex: tone, $options: 'i' } },
      ],
    });
  }

  if (hasEtymology === 'true') {
    query['etymology'] = { $exists: true, $ne: '' };
  }

  if (frequency) {
    const freqValue = String(frequency).toLowerCase();
    if (['high', 'medium', 'low'].includes(freqValue)) {
      query['frequency'] = { $regex: new RegExp(`^${freqValue}$`, 'i') };
    }
  }

  // Words that have at least one phrase (PhrasalVerb) or expression (idiom etc.)
  if (hasPhrases === 'true') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { phrasalVerbs: { $exists: true, $ne: [] } },
        { PhrasalVerbs: { $exists: true, $ne: [] } },
        { expressions: { $exists: true, $ne: [] } },
      ],
    });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const requestedLimit = parseInt(limit) || 12;
  const limitNum = Math.min(Math.max(1, requestedLimit), 50); // Cap at 50 to reduce bulk scraping
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sortOptions = {};
  const validSortFields = ['word', 'frequency', 'createdAt'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'word';
  sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

  // Get total count and paginated results
  const [words, totalCount] = await Promise.all([
    Word.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
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
  const normalized = normalizeWord(wordText);
  if (!normalized) {
    throw new ValidationError('Word text is required');
  }

  const word = await Word.findOne({
    $or: [
      { wordNormalized: normalized },
      { word: { $regex: new RegExp(`^${wordText}$`, 'i') } },
    ],
  })
    .populate({ path: 'meanings.synonyms', select: 'word pronunciation' })
    .populate({ path: 'meanings.antonyms', select: 'word pronunciation' })
    .populate({ path: 'expressions', select: 'expression type meanings' })
    .populate({ path: 'phrasalVerbs', select: 'phrase meaning example_sentences' })
    .populate({ path: 'PhrasalVerbs', select: 'phrase meaning example_sentences' })
    .populate({ path: 'questions', strictPopulate: false });

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
  const {
    word,
    pronunciation,
    frequency,
    overallTone,
    overall_tone,
    etymology,
    misspellings,
    note,
  } = updateData;
  const nextTone = overallTone ?? overall_tone;

  const updatedWord = await Word.findByIdAndUpdate(
    wordId,
    {
      word,
      pronunciation,
      frequency,
      overallTone: nextTone,
      overall_tone: nextTone,
      etymology,
      note,
      misspellings,
    },
    { new: true, runValidators: true }
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

    // Validate common usage (legacy common_usage + canonical commonUsage)
    const commonUsage = meaning.commonUsage ?? meaning.common_usage;
    if (commonUsage && Array.isArray(commonUsage)) {
      for (const [usageIndex, usage] of commonUsage.entries()) {
        if (!usage.context || !usage.example) {
          throw new ValidationError(
            `Common usage at index ${usageIndex} in meaning ${index} is missing context or example`
          );
        }
      }
    }

    // Validate example sentences (legacy string[] and canonical object[] with text)
    const exampleSentences = meaning.exampleSentences ?? meaning.example_sentences;
    if (exampleSentences && Array.isArray(exampleSentences)) {
      for (const [sentenceIndex, sentence] of exampleSentences.entries()) {
        if (typeof sentence === 'string' && sentence.trim()) {
          continue;
        }
        if (sentence && typeof sentence === 'object' && typeof sentence.text === 'string' && sentence.text.trim()) {
          continue;
        }
        throw new ValidationError(
          `Example sentence at index ${sentenceIndex} in meaning ${index} must be a non-empty string or object with text`
        );
      }
    }
  }

  const normalizeExampleSentences = (arr = []) =>
    arr.map((sentence) => {
      if (typeof sentence === 'string') return { text: sentence.trim() };
      return { ...sentence, text: sentence.text.trim() };
    });

  const normalizedMeanings = meanings.map((meaning) => {
    const commonUsage = meaning.commonUsage ?? meaning.common_usage ?? [];
    const kidDefinition = meaning.kidDefinition ?? meaning.kiddefinition;
    const exampleSentences = normalizeExampleSentences(
      meaning.exampleSentences ?? meaning.example_sentences ?? []
    );

    return {
      ...meaning,
      commonUsage,
      common_usage: commonUsage,
      kidDefinition,
      kiddefinition: kidDefinition,
      exampleSentences,
      example_sentences: exampleSentences,
    };
  });

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
  const updatedMeanings = normalizedMeanings.map((meaning) => {
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

/**
 * Cosine similarity between two vectors (same length).
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Value in [-1, 1]
 */
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
};

/**
 * Build a single searchable text for a word (used for embedding and semantic search).
 * @param {Object} wordDoc - Word document (plain or mongoose doc)
 * @returns {string}
 */
export const buildSearchableText = (wordDoc) => {
  if (!wordDoc) return '';
  const parts = [wordDoc.word || ''];
  if (Array.isArray(wordDoc.meanings)) {
    for (const m of wordDoc.meanings) {
      if (m.subtitle) parts.push(m.subtitle);
      if (m.meaning) parts.push(m.meaning);
      if (m.easyMeaning) parts.push(m.easyMeaning);
      if (m.kidDefinition) parts.push(m.kidDefinition);
      if (m.kiddefinition) parts.push(m.kiddefinition);
    }
  }
  if (wordDoc.etymology) parts.push(wordDoc.etymology);
  return parts.filter(Boolean).join(' ').trim() || wordDoc.word || '';
};

/**
 * Semantic search: embed query and return words ranked by embedding similarity.
 * Only words that already have an embedding are included; run backfill to add embeddings.
 * @param {string} query - Natural language or keyword query
 * @param {number} limit - Max results (default 10)
 * @returns {Promise<Array<{ word: Object, score: number }>>}
 */
export const semanticSearch = async (query, limit = 10) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const queryEmbedding = await getEmbedding(query.trim());
  if (!queryEmbedding || queryEmbedding.length === 0) {
    logger.warn('Semantic search: could not get query embedding');
    return [];
  }

  const words = await Word.find({ 'embedding.0': { $exists: true } })
    .select('+embedding')
    .limit(500) // cap for in-memory similarity
    .lean();

  if (words.length === 0) {
    logger.info('Semantic search: no words with embeddings found; run backfill first');
    return [];
  }

  const scored = words
    .filter((w) => Array.isArray(w.embedding) && w.embedding.length === queryEmbedding.length)
    .map((w) => ({
      word: { ...w, embedding: undefined },
      score: cosineSimilarity(queryEmbedding, w.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
};

/**
 * Generate and save embedding for a word (for backfill). Idempotent.
 * @param {string} wordId - Word ID
 * @returns {Promise<Object|null>} Updated word or null
 */
export const ensureWordEmbedding = async (wordId) => {
  if (!mongoose.Types.ObjectId.isValid(wordId)) {
    throw new ValidationError('Invalid word ID');
  }

  const word = await Word.findById(wordId).lean();
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const text = buildSearchableText(word);
  if (!text) {
    logger.warn(`No searchable text for word ${word.word}`);
    return null;
  }

  const embedding = await getEmbedding(text);
  if (!embedding) {
    logger.warn(`Could not generate embedding for word ${word.word}`);
    return null;
  }

  const updated = await Word.findByIdAndUpdate(
    wordId,
    { $set: { embedding } },
    { new: true }
  );
  logger.info(`Embedding saved for word: ${updated.word}`);
  return updated;
};

/**
 * Backfill embeddings for words that don't have one. Processes up to `limit` words.
 * @param {number} limit - Max words to process (default 20)
 * @returns {Promise<{ processed: number, succeeded: number, failed: number }>}
 */
export const backfillEmbeddings = async (limit = 20) => {
  const wordsWithText = await Word.find(
    { $or: [{ embedding: { $exists: false } }, { embedding: null }, { 'embedding.0': { $exists: false } }] }
  )
    .select('_id word meanings etymology')
    .limit(limit)
    .lean();

  if (!wordsWithText.length) return { processed: 0, succeeded: 0, failed: 0 };

  const texts = wordsWithText.map((w) => buildSearchableText(w));

  // Quota-efficiency:
  // - When using free-tier Gemini keys, embed requests are limited (429 quota).
  // - Since the API already caps `limit` to 100 per endpoint call, we do a single batch embedding call here.
  const vectors = await getEmbeddings(texts, 100);

  const ops = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < wordsWithText.length; i++) {
    const vec = vectors[i];
    if (Array.isArray(vec) && vec.length > 0) {
      succeeded += 1;
      ops.push({
        updateOne: {
          filter: { _id: wordsWithText[i]._id },
          update: { $set: { embedding: vec } },
        },
      });
    } else {
      failed += 1;
    }
  }

  if (ops.length > 0) {
    await Word.bulkWrite(ops, { ordered: false });
  }

  return { processed: wordsWithText.length, succeeded, failed };
};

/**
 * Category summary for FE:
 * Count how many distinct Word documents have at least one meaning with each category.
 *
 * @param {string[]} names - category names to include (exact match; expected to match stored casing)
 * @param {number} limit - optional limit for returned categories
 * @returns {Promise<Array<{ category: string, count: number }>>}
 */
export const getCategoryWordCounts = async (names = [], limit = 50) => {
  const parsedNames = Array.isArray(names)
    ? names.map((n) => (typeof n === 'string' ? n.trim() : '')).filter(Boolean)
    : [];

  const matchCategory = parsedNames.length
    ? { $in: parsedNames }
    : { $exists: true, $ne: null, $nin: ['', ' '] };

  const pipeline = [
    { $unwind: '$meanings' },
    { $match: { 'meanings.category': matchCategory } },
    // Deduplicate so one word with multiple meanings in the same category counts once.
    { $group: { _id: { wordId: '$_id', cat: '$meanings.category' } } },
    { $group: { _id: '$_id.cat', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];

  if (Number.isFinite(limit) && limit > 0) {
    pipeline.push({ $limit: Math.min(limit, 200) });
  }

  const results = await Word.aggregate(pipeline);
  return results.map((r) => ({
    category: r._id,
    count: r.count,
  }));
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
  buildSearchableText,
  semanticSearch,
  ensureWordEmbedding,
  backfillEmbeddings,
  getCategoryWordCounts,
};

