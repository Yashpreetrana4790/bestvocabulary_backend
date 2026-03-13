import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';

const genAI = new GoogleGenerativeAI(config.geminiAiKey);

/**
 * Get a single text embedding using Gemini
 * @param {string} text - Text to embed
 * @returns {Promise<number[]|null>} Embedding vector or null
 */
export const getEmbedding = async (text) => {
  try {
    if (!text || typeof text !== 'string' || !text.trim()) {
      logger.warn('Embedding service: empty text provided');
      return null;
    }

    if (!config.geminiAiKey) {
      logger.error('GEMINI_AI_KEY is not configured for embeddings');
      return null;
    }

    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text.trim());
    const values = result?.embedding?.values;

    if (!Array.isArray(values) || values.length === 0) {
      logger.warn('Embedding service: empty or invalid response');
      return null;
    }

    return values;
  } catch (error) {
    logger.error('Embedding service error:', error?.message || error);
    return null;
  }
};

/**
 * Get embeddings for multiple texts (batch). Uses single-call if one text, otherwise batches in chunks to respect API limits.
 * @param {string[]} texts - Array of texts to embed
 * @param {number} batchSize - Max texts per batch (default 100)
 * @returns {Promise<Array<number[]|null>>} Array of embedding vectors (null for failed items)
 */
export const getEmbeddings = async (texts, batchSize = 100) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  if (!config.geminiAiKey) {
    logger.error('GEMINI_AI_KEY is not configured for embeddings');
    return texts.map(() => null);
  }

  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchRequests = batch.map((text) =>
      typeof text === 'string' && text.trim()
        ? { content: { parts: [{ text: text.trim() }] } }
        : null
    );

    try {
      const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
      const response = await model.batchEmbedContents({ requests: batchRequests.filter(Boolean) });

      if (response?.embeddings?.length) {
        let idx = 0;
        for (const item of batch) {
          if (typeof item === 'string' && item.trim()) {
            results.push(response.embeddings[idx]?.values ?? null);
            idx += 1;
          } else {
            results.push(null);
          }
        }
      } else {
        batch.forEach(() => results.push(null));
      }
    } catch (error) {
      logger.error('Batch embedding error:', error?.message || error);
      batch.forEach(() => results.push(null));
    }
  }

  return results;
};

export default {
  getEmbedding,
  getEmbeddings,
};
