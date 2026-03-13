import Word from '../models/wordmodel.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

const genAI = new GoogleGenerativeAI(config.geminiAiKey);

const LANGUAGE_ORIGINS = {
  'Latin': { lat: 41.9028, lng: 12.4964, region: 'Rome, Italy' },
  'Greek': { lat: 37.9838, lng: 23.7275, region: 'Athens, Greece' },
  'Old English': { lat: 51.5074, lng: -0.1278, region: 'England' },
  'Middle English': { lat: 51.5074, lng: -0.1278, region: 'England' },
  'French': { lat: 48.8566, lng: 2.3522, region: 'Paris, France' },
  'Old French': { lat: 48.8566, lng: 2.3522, region: 'France' },
  'German': { lat: 52.52, lng: 13.405, region: 'Berlin, Germany' },
  'Old High German': { lat: 48.1351, lng: 11.582, region: 'Bavaria, Germany' },
  'Spanish': { lat: 40.4168, lng: -3.7038, region: 'Madrid, Spain' },
  'Italian': { lat: 41.9028, lng: 12.4964, region: 'Rome, Italy' },
  'Sanskrit': { lat: 28.6139, lng: 77.209, region: 'India' },
  'Arabic': { lat: 24.7136, lng: 46.6753, region: 'Arabian Peninsula' },
  'Hebrew': { lat: 31.7683, lng: 35.2137, region: 'Jerusalem' },
  'Proto-Germanic': { lat: 54.5, lng: 9.5, region: 'Northern Europe' },
  'Proto-Indo-European': { lat: 46.0, lng: 35.0, region: 'Pontic Steppe' },
  'Old Norse': { lat: 59.9139, lng: 10.7522, region: 'Scandinavia' },
  'Dutch': { lat: 52.3676, lng: 4.9041, region: 'Amsterdam, Netherlands' },
  'Portuguese': { lat: 38.7223, lng: -9.1393, region: 'Lisbon, Portugal' },
  'Russian': { lat: 55.7558, lng: 37.6173, region: 'Moscow, Russia' },
  'Japanese': { lat: 35.6762, lng: 139.6503, region: 'Tokyo, Japan' },
  'Chinese': { lat: 39.9042, lng: 116.4074, region: 'Beijing, China' },
  'Persian': { lat: 35.6892, lng: 51.389, region: 'Tehran, Iran' },
  'Celtic': { lat: 53.3498, lng: -6.2603, region: 'Ireland' },
  'Welsh': { lat: 51.4816, lng: -3.1791, region: 'Cardiff, Wales' },
};

/**
 * Generate etymology details using AI
 */
export const generateEtymologyWithAI = async (word, existingEtymology = '') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze the etymology of the word "${word}". ${existingEtymology ? `Existing etymology info: ${existingEtymology}` : ''}

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "description": "A brief summary of the word's origin",
  "origins": [
    {
      "language": "Language name (e.g., Latin, Greek, French)",
      "originalWord": "The word in that language",
      "meaning": "What it meant",
      "period": "Time period (e.g., 14th century, Ancient)"
    }
  ],
  "rootWords": [
    {
      "root": "The root/prefix/suffix",
      "meaning": "What it means",
      "language": "Origin language"
    }
  ],
  "evolution": [
    {
      "period": "Time period",
      "form": "How the word looked",
      "meaning": "What it meant then",
      "language": "Language at that time"
    }
  ],
  "cognates": [
    {
      "word": "Related word in another language",
      "language": "That language",
      "meaning": "Its meaning"
    }
  ]
}

Focus on accuracy and include at least 2-3 items in each array where relevant.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const etymologyData = JSON.parse(jsonMatch[0]);

    if (etymologyData.origins) {
      etymologyData.origins = etymologyData.origins.map(origin => {
        const coords = LANGUAGE_ORIGINS[origin.language];
        return {
          ...origin,
          languageCode: origin.language.substring(0, 2).toUpperCase(),
          region: coords ? {
            name: coords.region,
            coordinates: { lat: coords.lat, lng: coords.lng }
          } : null
        };
      });
    }

    return etymologyData;
  } catch (error) {
    logger.error('AI etymology generation failed:', error);
    return null;
  }
};

/**
 * Update word etymology details
 */
export const updateWordEtymology = async (wordId, etymologyDetails) => {
  const word = await Word.findByIdAndUpdate(
    wordId,
    { $set: { etymologyDetails } },
    { new: true }
  );

  if (!word) {
    throw new NotFoundError('Word not found');
  }

  return word;
};

/**
 * Generate and save etymology for a word
 */
export const generateAndSaveEtymology = async (wordId) => {
  const word = await Word.findById(wordId);
  if (!word) {
    throw new NotFoundError('Word not found');
  }

  const etymologyDetails = await generateEtymologyWithAI(word.word, word.etymology);
  if (!etymologyDetails) {
    return null;
  }

  word.etymologyDetails = etymologyDetails;
  await word.save();

  return word;
};

/**
 * Get words by origin language
 */
export const getWordsByOrigin = async (language, limit = 50) => {
  const words = await Word.find({
    'etymologyDetails.origins.language': { $regex: language, $options: 'i' }
  })
  .select('word pronunciation etymology etymologyDetails meanings')
  .limit(limit)
  .lean();

  return words;
};

/**
 * Get origin map data - words grouped by their language origins
 */
export const getOriginMapData = async () => {
  const words = await Word.find({
    'etymologyDetails.origins': { $exists: true, $ne: [] }
  })
  .select('word etymologyDetails.origins')
  .lean();

  const originMap = {};

  words.forEach(word => {
    if (word.etymologyDetails?.origins) {
      word.etymologyDetails.origins.forEach(origin => {
        if (origin.language && origin.region?.coordinates) {
          if (!originMap[origin.language]) {
            originMap[origin.language] = {
              language: origin.language,
              coordinates: origin.region.coordinates,
              regionName: origin.region.name,
              words: []
            };
          }
          originMap[origin.language].words.push({
            word: word.word,
            originalWord: origin.originalWord,
            meaning: origin.meaning,
            period: origin.period
          });
        }
      });
    }
  });

  return Object.values(originMap);
};

/**
 * Add word relation
 */
export const addWordRelation = async (wordId, relatedWordId, relationStrength = 0.5) => {
  const [word, relatedWord] = await Promise.all([
    Word.findById(wordId),
    Word.findById(relatedWordId)
  ]);

  if (!word || !relatedWord) {
    throw new NotFoundError('Word not found');
  }

  const existingRelation = word.relatedWords?.find(
    r => r.wordId?.toString() === relatedWordId
  );

  if (existingRelation) {
    existingRelation.relationStrength = relationStrength;
  } else {
    if (!word.relatedWords) word.relatedWords = [];
    word.relatedWords.push({
      wordId: relatedWord._id,
      word: relatedWord.word,
      relationStrength
    });
  }

  await word.save();

  const reverseExisting = relatedWord.relatedWords?.find(
    r => r.wordId?.toString() === wordId
  );

  if (!reverseExisting) {
    if (!relatedWord.relatedWords) relatedWord.relatedWords = [];
    relatedWord.relatedWords.push({
      wordId: word._id,
      word: word.word,
      relationStrength
    });
    await relatedWord.save();
  }

  return word;
};

/**
 * Get word relations graph
 */
export const getWordRelationsGraph = async (wordId, depth = 2) => {
  const buildGraph = async (id, currentDepth, visited = new Set()) => {
    if (currentDepth > depth || visited.has(id.toString())) {
      return null;
    }

    visited.add(id.toString());

    const word = await Word.findById(id)
      .select('word relatedWords meanings.synonyms meanings.antonyms')
      .populate('relatedWords.wordId', 'word')
      .populate('meanings.synonyms', 'word')
      .populate('meanings.antonyms', 'word')
      .lean();

    if (!word) return null;

    const node = {
      id: word._id.toString(),
      word: word.word,
      relations: []
    };

    const allRelated = [
      ...(word.relatedWords || []).map(r => ({ 
        id: r.wordId?._id || r.wordId, 
        word: r.wordId?.word || r.word,
        type: 'related',
        strength: r.relationStrength 
      })),
      ...(word.meanings || []).flatMap(m => [
        ...(m.synonyms || []).map(s => ({ 
          id: s._id, 
          word: s.word, 
          type: 'synonym',
          strength: 0.8 
        })),
        ...(m.antonyms || []).map(a => ({ 
          id: a._id, 
          word: a.word, 
          type: 'antonym',
          strength: 0.7 
        }))
      ])
    ];

    for (const related of allRelated) {
      if (related.id && !visited.has(related.id.toString())) {
        const childNode = await buildGraph(related.id, currentDepth + 1, visited);
        node.relations.push({
          ...related,
          node: childNode
        });
      }
    }

    return node;
  };

  return buildGraph(wordId, 0);
};

/**
 * Batch generate etymology for words without it
 */
export const batchGenerateEtymology = async (limit = 10) => {
  const words = await Word.find({
    $or: [
      { etymologyDetails: { $exists: false } },
      { 'etymologyDetails.origins': { $size: 0 } }
    ]
  })
  .select('_id word etymology')
  .limit(limit);

  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    words: []
  };

  for (const word of words) {
    results.processed++;
    try {
      const updated = await generateAndSaveEtymology(word._id);
      if (updated) {
        results.success++;
        results.words.push({ word: word.word, status: 'success' });
      } else {
        results.failed++;
        results.words.push({ word: word.word, status: 'failed' });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.failed++;
      results.words.push({ word: word.word, status: 'error', error: error.message });
    }
  }

  return results;
};
