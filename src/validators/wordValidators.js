import z from 'zod';
import mongoose from 'mongoose';

const difficultyEnum = z.enum(['Easy', 'Beginner', 'Medium', 'Intermediate', 'Hard', 'Advanced']);
const frequencyEnum = z.enum(['low', 'medium', 'high']);

const usageItemSchema = z.object({
  context: z.string().min(1),
  example: z.string().min(1),
});

const exampleSentenceSchema = z.union([
  z.string().min(1),
  z.object({
    text: z.string().min(1),
    context: z.string().optional(),
    source: z.string().optional(),
    register: z.string().optional(),
  }),
]);

export const updateWordSchema = z.object({
  word: z.string().optional(),
  pronunciation: z.string().optional(),
  frequency: z.union([frequencyEnum, z.string().min(1)]).optional(),
  overallTone: z.string().optional(),
  overall_tone: z.string().optional(),
  etymology: z.string().optional(),
  note: z.string().optional(),
  misspellings: z.array(z.string()).optional(),
  usageDistribution: z.object({
    spoken: z.number().min(0).max(100).optional(),
    written: z.number().min(0).max(100).optional(),
  }).optional(),
  usage_distribution: z.object({
    spoken: z.number().min(0).max(100).optional(),
    written: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const updateMeaningsSchema = z.object({
  meanings: z.array(
    z.object({
      _id: z.string().optional(),
      pos: z.string(),
      subtitle: z.string().optional(),
      pronunciation: z.string(),
      commonUsage: z.array(usageItemSchema).optional(),
      common_usage: z.array(usageItemSchema).optional(),
      tone: z.string().optional(),
      category: z.string().optional(),
      difficulty: z.union([difficultyEnum, z.string().min(1)]).optional(),
      meaning: z.string(),
      mnemonic: z.string().optional(),
      easyMeaning: z.string().optional(),
      kidDefinition: z.string().optional(),
      kiddefinition: z.string().optional(),
      exampleSentences: z.array(exampleSentenceSchema).optional(),
      example_sentences: z.array(exampleSentenceSchema).optional(),
      notes: z.string().optional(),
    })
  ),
});

export const getWordsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  difficulty: z.string().optional(),
  length: z.string().optional(),
  startsWith: z.string().optional(),
});

export const wordOfTheDaySchema = z.object({
  wordId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid word ID format',
  }),
});

export const validateMongoObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export default {
  updateWordSchema,
  updateMeaningsSchema,
  getWordsQuerySchema,
  wordOfTheDaySchema,
  validateMongoObjectId,
};

