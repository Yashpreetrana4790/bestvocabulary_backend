import z from 'zod';

export const phrasalVerbSchema = z.object({
  phrase: z.string().min(1, 'Phrase is required'),
  meaning: z.string().min(1, 'Meaning is required'),
  example_sentences: z.array(z.string()).optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  relatedWords: z.array(z.string()).optional(),
});

export const getAllPhrasesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

export default {
  phrasalVerbSchema,
  getAllPhrasesQuerySchema,
};

