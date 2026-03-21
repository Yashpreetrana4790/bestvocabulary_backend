import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const GROQ_EMBEDDING_MODEL = 'nomic-embed-text-v1_5';
const GROQ_EMBEDDINGS_URL = 'https://api.groq.com/openai/v1/embeddings';

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

const genAI = config.geminiAiKey ? new GoogleGenerativeAI(config.geminiAiKey) : null;

const getEmbeddingFromGroq = async (text) => {
  if (!config.groqApiKey) return null;

  try {
    const resp = await fetch(GROQ_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.groqApiKey,
      },
      body: JSON.stringify({
        model: GROQ_EMBEDDING_MODEL,
        input: text.trim(),
      }),
    });

    if (!resp.ok) return null;

    const json = await resp.json();
    const values = json?.data?.[0]?.embedding;

    if (!Array.isArray(values) || values.length === 0) return null;
    return values;
  } catch {
    return null;
  }
};

const getEmbeddingFromGemini = async (text) => {
  if (!config.geminiAiKey || !genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
    const result = await model.embedContent(text.trim());
    const values = result?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values;
  } catch {
    return null;
  }
};

/**
 * Get a single text embedding
 * Priority: Groq (if available) -> Gemini (fallback)
 * @param {string} text - Text to embed
 * @returns {Promise<number[]|null>} Embedding vector or null
 */
export const getEmbedding = async (text) => {
  try {
    if (!text || typeof text !== 'string' || !text.trim()) {
      logger.warn('Embedding service: empty text provided');
      return null;
    }

    const groq = await getEmbeddingFromGroq(text);
    if (groq) return groq;

    return await getEmbeddingFromGemini(text);
  } catch (error) {
    logger.error('Embedding service error:', error?.message || error);
    return null;
  }
};

const getEmbeddingsFromGroq = async (texts, batchSize) => {
  if (!config.groqApiKey) return null;

  const results = new Array(texts.length).fill(null);

  for (let start = 0; start < texts.length; start += batchSize) {
    const chunk = texts.slice(start, start + batchSize);

    const nonEmpty = [];
    for (let i = 0; i < chunk.length; i++) {
      const t = chunk[i];
      if (typeof t === 'string' && t.trim()) nonEmpty.push({ originalIndex: start + i, text: t.trim() });
    }

    if (nonEmpty.length === 0) continue;

    try {
      const resp = await fetch(GROQ_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.groqApiKey,
        },
        body: JSON.stringify({
          model: GROQ_EMBEDDING_MODEL,
          input: nonEmpty.map((x) => x.text),
        }),
      });

      if (!resp.ok) continue;

      const json = await resp.json();
      const returned = json?.data || [];

      for (const item of returned) {
        const idx = item?.index;
        const embedding = item?.embedding;
        if (typeof idx !== 'number' || !Array.isArray(embedding) || embedding.length === 0) continue;
        const original = nonEmpty[idx]?.originalIndex;
        if (typeof original === 'number') results[original] = embedding;
      }
    } catch {
      // Keep nulls and let fallback handle.
    }
  }

  return results;
};

const getEmbeddingsFromGemini = async (texts, batchSize) => {
  if (!config.geminiAiKey || !genAI) return null;

  const results = new Array(texts.length).fill(null);

  for (let start = 0; start < texts.length; start += batchSize) {
    const chunk = texts.slice(start, start + batchSize);

    const requests = [];
    const positions = [];

    for (let i = 0; i < chunk.length; i++) {
      const t = chunk[i];
      if (typeof t === 'string' && t.trim()) {
        requests.push({ content: { parts: [{ text: t.trim() }] } });
        positions.push(start + i);
      }
    }

    if (requests.length === 0) continue;

    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
      const response = await model.batchEmbedContents({ requests });

      const embeddings = response?.embeddings || [];
      for (let j = 0; j < positions.length; j++) {
        results[positions[j]] = embeddings[j]?.values ?? null;
      }
    } catch {
      // Keep nulls and let caller interpret as failure.
    }
  }

  return results;
};

/**
 * Get embeddings for multiple texts (batch). Uses batching in chunks.
 * Priority: Groq -> Gemini fallback
 * @param {string[]} texts - Array of texts to embed
 * @param {number} batchSize - Max texts per batch (default 100)
 * @returns {Promise<Array<number[]|null>>} Array of embedding vectors (null for failed items)
 */
export const getEmbeddings = async (texts, batchSize = 100) => {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const groqVectors = config.groqApiKey ? await getEmbeddingsFromGroq(texts, batchSize) : null;
  const groqAny =
    Array.isArray(groqVectors) && groqVectors.some((v) => Array.isArray(v) && v.length > 0);
  if (groqAny) return groqVectors;

  const geminiVectors = config.geminiAiKey ? await getEmbeddingsFromGemini(texts, batchSize) : null;
  if (Array.isArray(geminiVectors)) return geminiVectors;

  return texts.map(() => null);
};

export default {
  getEmbedding,
  getEmbeddings,
};
