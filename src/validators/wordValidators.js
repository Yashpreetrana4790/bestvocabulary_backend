import z from 'zod';
import mongoose from 'mongoose';

export const updateWordSchema = z.object({
  word: z.string().optional(),
  pronunciation: z.string().optional(),
  frequency: z.string().optional(),
  overall_tone: z.string().optional(),
  etymology: z.string().optional(),
  note: z.string().optional(),
  misspellings: z.array(z.string()).optional(),
});

export const updateMeaningsSchema = z.object({
  meanings: z.array(
    z.object({
      pos: z.string(),
      subtitle: z.string().optional(),
      pronunciation: z.string(),
      common_usage: z
        .array(
          z.object({
            context: z.string(),
            example: z.string(),
          })
        )
        .optional(),
      tone: z.string().optional(),
      category: z.string().optional(),
      difficulty: z.string().optional(),
      meaning: z.string(),
      mnemonic: z.string().optional(),
      easyMeaning: z.string().optional(),
      kiddefinition: z.string().optional(),
      example_sentences: z.array(z.any()).optional(),
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

