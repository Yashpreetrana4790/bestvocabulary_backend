import mongoose from "mongoose";

const { Schema } = mongoose;

// Confused Words Schema - commonly confused word pairs
const confusedWordsSchema = new Schema({
  word1: {
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    pronunciation: { type: String },
    examples: [{ type: String }]
  },
  word2: {
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    pronunciation: { type: String },
    examples: [{ type: String }]
  },
  explanation: { type: String, required: true },
  commonMistake: { type: String },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'], 
    default: 'medium' 
  },
  tags: [{ type: String }],
  memoryTip: { type: String }
}, {
  timestamps: true
});

const ConfusedWords = mongoose.model("ConfusedWords", confusedWordsSchema);

export default ConfusedWords;

