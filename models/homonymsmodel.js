import mongoose from "mongoose";

const { Schema } = mongoose;

// Homonym Schema - words that are spelled and sound the same but have different meanings
const homonymSchema = new Schema({
  word: { type: String, required: true, unique: true },
  meanings: [{
    meaning: { type: String, required: true },
    partOfSpeech: { type: String },
    example: { type: String },
    context: { type: String }
  }],
  pronunciation: { type: String },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'], 
    default: 'medium' 
  },
  etymology: { type: String },
  tags: [{ type: String }]
}, {
  timestamps: true
});

const Homonym = mongoose.model("Homonym", homonymSchema);

export default Homonym;

