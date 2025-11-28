import mongoose from "mongoose";

const { Schema } = mongoose;

// Phrasal Verb Schema
const phrasalVerbSchema = new Schema({
  phrase: { type: String, required: true, unique: true },
  meaning: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'], default: 'medium' },
  example_sentences: [{ type: String }],
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
  relatedWords: [{ type: String }],
  homonyms: [{ 
    word: { type: String, required: true },
    meaning: { type: String },
    order: { type: Number, default: 0 }
  }],
  confusedWords: [{ 
    word: { type: String, required: true },
    explanation: { type: String },
    order: { type: Number, default: 0 }
  }],
  comparisons: [{
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    differences: [{ type: String }]
  }],
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const PhrasalVerb = mongoose.model("PhrasalVerb", phrasalVerbSchema);

export default PhrasalVerb;
