import mongoose from "mongoose";

const { Schema } = mongoose;

// Homophone Group Schema - words that sound the same but have different meanings/spellings
const homophoneGroupSchema = new Schema({
  words: [{
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    example: { type: String },
    pronunciation: { type: String }
  }],
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'], 
    default: 'medium' 
  },
  tags: [{ type: String }],
  notes: { type: String }
}, {
  timestamps: true
});

const HomophoneGroup = mongoose.model("HomophoneGroup", homophoneGroupSchema);

export default HomophoneGroup;

