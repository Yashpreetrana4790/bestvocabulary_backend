import mongoose from "mongoose";

const { Schema } = mongoose;

// Idiom Schema
const idiomSchema = new Schema({
  idiom: { type: String, required: true, unique: true },
  meaning: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard', 'Beginner', 'Intermediate', 'Advanced'], 
    default: 'medium' 
  },
  example_sentences: [{ type: String }],
  origin: { type: String },
  usage_notes: { type: String },
  relatedItems: [{
    type: { 
      type: String, 
      enum: ['word', 'expression', 'idiom', 'phrase'],
      required: true 
    },
    itemId: { 
      type: Schema.Types.ObjectId, 
      required: true 
    }
  }],
  tags: [{ type: String }],
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const Idiom = mongoose.model("Idiom", idiomSchema);

export default Idiom;

