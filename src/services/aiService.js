import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { generatePrompt, WORD_JSON_SCHEMA_INSTRUCTIONS } from '../utils/prompt.js';

const genAI = new GoogleGenerativeAI(config.geminiAiKey);

/**
 * Safely parse JSON response
 * @param {string} text - Text to parse
 * @returns {Object|null} Parsed JSON or null
 */
const safeJsonParse = (text) => {
  try {
    if (!text) return null;
    let cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    logger.error('❌ JSON Parsing Error:', error.message);
    return null;
  }
};

/**
 * Get AI-generated word data
 * @param {string} word - Word to generate data for
 * @returns {Promise<Object|null>} Generated word data or null
 */
export const getGoogleChatCompletion = async (word) => {
  try {
    if (!word) {
      logger.error('No word provided to AI service');
      return null;
    }

    if (!config.geminiAiKey) {
      logger.error('GEMINI_AI_KEY is not configured');
      return null;
    }

    // Generate the prompt
    const userPrompt = generatePrompt(word);

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    // Send the user prompt to the model
    const result = await model.generateContent(userPrompt);

    const response = await result.response;
    const responseText = await response.text();

    logger.info(`AI generated response for word: ${word}`);

    // Parse the response as JSON
    return safeJsonParse(responseText);
  } catch (error) {
    logger.error('Error in AI service:', error);
    return null;
  }
};

/**
 * Generate word with context (topic, difficulty, etc.)
 * @param {string} topic - Topic category (e.g., "Business", "Medical")
 * @param {string} difficulty - Difficulty level
 * @param {string} context - Additional context
 * @returns {Promise<Object|null>} Generated word data
 */
export const generateContextualWord = async (topic, difficulty = 'Intermediate', context = '') => {
  try {
    if (!topic) {
      logger.error('No topic provided');
      return null;
    }

    if (!config.geminiAiKey) {
      logger.error('GEMINI_AI_KEY is not configured');
      return null;
    }

    const contextualPrompt = `
      Generate a vocabulary word that fits the following criteria:
      
      Topic: ${topic}
      Difficulty Level: ${difficulty}
      ${context ? `Context: ${context}` : ''}
      
      Return the same comprehensive JSON format as the standard word generation, but ensure the word is:
      - Relevant to the topic specified
      - Matches the difficulty level
      - Useful for learners in that domain
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(contextualPrompt);
    const response = await result.response;
    const responseText = await response.text();

    logger.info(`AI generated contextual word for topic: ${topic}`);
    return safeJsonParse(responseText);
  } catch (error) {
    logger.error('Error generating contextual word:', error);
    return null;
  }
};

/**
 * Generate batch of words
 * @param {number} count - Number of words to generate
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of generated words
 */
export const generateWordsBatch = async (count = 5, filters = {}) => {
  try {
    if (count > 20) {
      logger.warn('Batch size limited to 20 words');
      count = 20;
    }

    if (!config.geminiAiKey) {
      logger.error('GEMINI_AI_KEY is not configured');
      return [];
    }

    const batchPrompt = `
You are a lexicographer API. Output ONE JSON array only (no markdown, no extra text).

Generate ${count} diverse vocabulary words with complete information.
${filters.topic ? `Topic focus: ${filters.topic}` : ''}
${filters.difficulty ? `Difficulty level: ${filters.difficulty}` : ''}

Return a JSON array of exactly ${count} objects. Each object MUST follow the same schema below.
Vary parts of speech and senses; cover different aspects of ${filters.topic || 'English'} vocabulary.

${WORD_JSON_SCHEMA_INSTRUCTIONS}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(batchPrompt);
    const response = await result.response;
    const responseText = await response.text();

    const parsed = safeJsonParse(responseText);
    if (Array.isArray(parsed)) {
      logger.info(`AI generated batch of ${parsed.length} words`);
      return parsed;
    }

    logger.warn('Expected array from batch generation, got:', typeof parsed);
    return [];
  } catch (error) {
    logger.error('Error generating word batch:', error);
    return [];
  }
};

/**
 * Validate word content quality using AI
 * @param {Object} wordData - Word data to validate
 * @returns {Promise<Object>} Validation results
 */
export const validateWordContent = async (wordData) => {
  try {
    if (!wordData) {
      return { valid: false, errors: ['No word data provided'] };
    }

    if (!config.geminiAiKey) {
      return { valid: true, errors: [], message: 'AI validation not available' };
    }

    const validationPrompt = `
Review the following vocabulary word data for quality and schema fit (frequency low/medium/high;
overall_tone in formal|informal|neutral|academic|technical|colloquial|literary;
meaning difficulty in Easy|Beginner|Medium|Intermediate|Hard|Advanced;
example_sentences as objects with "text"; usage_distribution spoken+written ≤ 100;
synonyms/antonyms on meanings should be [] if strings were incorrectly used).

Data:
${JSON.stringify(wordData, null, 2)}

Return ONLY a JSON object with:
- valid: (boolean)
- errors: (array of strings)
- suggestions: (array of strings)
- completeness_score: (number 0-100)
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(validationPrompt);
    const response = await result.response;
    const responseText = await response.text();

    const validation = safeJsonParse(responseText);
    logger.info(`AI validation completed for word: ${wordData.word}`);
    return validation || { valid: true, errors: [], suggestions: [] };
  } catch (error) {
    logger.error('Error validating word content:', error);
    return { valid: true, errors: [], message: 'Validation service unavailable' };
  }
};

export default {
  getGoogleChatCompletion,
  generateContextualWord,
  generateWordsBatch,
  validateWordContent,
};

