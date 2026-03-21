import mongoose from "mongoose";

const DIFFICULTY_VALUES = ["Easy", "Beginner", "Medium", "Intermediate", "Hard", "Advanced"];
const FREQUENCY_VALUES = ["low", "medium", "high"];
const TONE_VALUES = ["formal", "informal", "neutral", "academic", "technical", "colloquial", "literary"];

const normalizeWordValue = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const uniqueObjectIdArray = (arr) => {
  if (!Array.isArray(arr)) return true;
  const vals = arr.map((v) => v?.toString()).filter(Boolean);
  return vals.length === new Set(vals).size;
};

const originSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    trim: true,
  },
  languageCode: { type: String, trim: true },
  originalWord: { type: String, trim: true },
  meaning: { type: String, trim: true },
  period: { type: String, trim: true },
  region: {
    name: { type: String, trim: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
}, { _id: false });

const etymologyDetailSchema = new mongoose.Schema({
  description: { type: String, trim: true },
  origins: [originSchema],
  rootWords: [{
    root: { type: String, trim: true },
    meaning: { type: String, trim: true },
    language: { type: String, trim: true },
  }],
  evolution: [{
    period: { type: String, trim: true },
    form: { type: String, trim: true },
    meaning: { type: String, trim: true },
    language: { type: String, trim: true },
  }],
  cognates: [{
    word: { type: String, trim: true },
    language: { type: String, trim: true },
    meaning: { type: String, trim: true },
  }],
}, { _id: false });

const wordRelationSchema = new mongoose.Schema({
  wordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Word",
  },
  word: { type: String, trim: true },
  relationStrength: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
}, { _id: false });

const commonUsageSchema = new mongoose.Schema({
  context: {
    type: String,
    trim: true,
    required: true,
  },
  example: {
    type: String,
    trim: true,
    required: true,
  },
}, { _id: false });

const exampleSentenceSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
    required: true,
  },
  context: {
    type: String,
    trim: true,
  },
  source: {
    type: String,
    trim: true,
  },
  register: {
    type: String,
    trim: true,
  },
}, { _id: false });

const collocationSchema = new mongoose.Schema({
  phrase: {
    type: String,
    trim: true,
    required: true,
  },
  pattern: {
    type: String,
    trim: true,
  },
  example: {
    type: String,
    trim: true,
  },
  score: {
    type: Number,
    min: 0,
    max: 1,
  },
}, { _id: false });

const morphemeSchema = new mongoose.Schema({
  part: { type: String, trim: true },
  type: { type: String, trim: true },
  meaning: { type: String, trim: true },
  originLanguage: { type: String, trim: true },
}, { _id: false });

const rootAnalysisSchema = new mongoose.Schema({
  root: { type: String, trim: true },
  prefix: { type: String, trim: true },
  suffix: { type: String, trim: true },
  notes: { type: String, trim: true },
  morphemes: [morphemeSchema],
}, { _id: false });

const usageDistributionSchema = new mongoose.Schema({
  spoken: {
    type: Number,
    min: 0,
    max: 100,
  },
  written: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

const wordFamilySchema = new mongoose.Schema({
  base: {
    type: String,
    trim: true,
  },
  inflected: {
    type: [String],
    default: [],
  },
  derived: {
    type: [String],
    default: [],
  },
}, { _id: false });

const meaningSchema = new mongoose.Schema({
  pos: {
    type: String,
    trim: true,
    required: true,
  },
  subtitle: {
    type: String,
    trim: true,
  },
  pronunciation: {
    type: String,
    trim: true,
    required: true,
  },
  commonUsage: {
    type: [commonUsageSchema],
    alias: "common_usage",
    default: [],
  },
  tone: {
    type: String,
    trim: true,
    lowercase: true,
  },
  category: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    trim: true,
    enum: DIFFICULTY_VALUES,
  },
  meaning: {
    type: String,
    trim: true,
    required: true,
  },
  mnemonic: {
    type: String,
    trim: true,
  },
  easyMeaning: {
    type: String,
    trim: true,
  },
  kidDefinition: {
    type: String,
    trim: true,
    alias: "kiddefinition",
  },
  exampleSentences: {
    type: [exampleSentenceSchema],
    alias: "example_sentences",
    default: [],
  },
  notes: {
    type: String,
    trim: true,
  },
  synonyms: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Word" }],
    default: [],
    validate: {
      validator: uniqueObjectIdArray,
      message: "Synonyms must be unique per meaning",
    },
  },
  antonyms: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Word" }],
    default: [],
    validate: {
      validator: uniqueObjectIdArray,
      message: "Antonyms must be unique per meaning",
    },
  },
}, { _id: true });

const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    trim: true,
  },
  wordNormalized: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  pronunciation: {
    type: String,
    required: true,
    trim: true,
  },
  frequency: {
    type: String,
    trim: true,
    lowercase: true,
    enum: FREQUENCY_VALUES,
  },
  overallTone: {
    type: String,
    trim: true,
    lowercase: true,
    enum: TONE_VALUES,
    alias: "overall_tone",
  },
  etymology: {
    type: String,
    trim: true,
  },
  etymologyDetails: etymologyDetailSchema,
  misspellings: [{ type: String, trim: true, lowercase: true }],
  usageDistribution: {
    type: usageDistributionSchema,
    alias: "usage_distribution",
  },
  wordFamily: {
    type: wordFamilySchema,
    alias: "word_family",
  },
  relatedWords: [wordRelationSchema],
  note: {
    type: String,
    trim: true,
  },

  meanings: [meaningSchema],
  expressions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expression",
  }],
  phrasalVerbs: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "PhrasalVerb",
    }],
    alias: "PhrasalVerbs",
    default: [],
  },
  historicalUsage: {
    type: String,
    trim: true,
    alias: "historical_usage",
  },
  collocations: {
    type: [collocationSchema],
    default: [],
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  }],
  rootAnalysis: {
    type: rootAnalysisSchema,
    alias: "root_analysis",
  },
  // AI embedding for semantic search (Gemini). Optional; backfill via admin/script.
  embedding: {
    type: [Number],
    select: false, // exclude from default queries; use .select('+embedding') for semantic search
  },
}, {
  timestamps: true,
});

wordSchema.pre("validate", function normalizeWord(next) {
  this.wordNormalized = normalizeWordValue(this.word);
  if (!this.wordNormalized) {
    return next(new Error("wordNormalized cannot be empty"));
  }
  return next();
});

wordSchema.path("usageDistribution").validate(function validateUsageDistribution(value) {
  if (!value) return true;
  const spoken = Number.isFinite(value.spoken) ? value.spoken : 0;
  const written = Number.isFinite(value.written) ? value.written : 0;
  return spoken + written <= 100;
}, "usageDistribution spoken + written must be <= 100");

wordSchema.index({ word: 1 });
wordSchema.index({ createdAt: -1 });
wordSchema.index({ frequency: 1 });
wordSchema.index({ overallTone: 1 });
wordSchema.index({ "meanings.difficulty": 1 });
wordSchema.index({ "meanings.category": 1 });
wordSchema.index({ "meanings.pos": 1 });
wordSchema.index({ "meanings.category": 1, "meanings.difficulty": 1 });
wordSchema.index({ expressions: 1 });
wordSchema.index({ phrasalVerbs: 1 });

const Word = mongoose.model("Word", wordSchema);
export default Word;