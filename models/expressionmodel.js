import mongoose from "mongoose";

const { Schema } = mongoose;

const expressionSchema = new Schema({
  expression: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  pronunciation: {
    type: String
  },
  meanings: [
    {
      meaning: { type: String, required: true },
      examples: { type: [String], required: true }, // Ensures at least one example
      notes: { type: String }
    }
  ],
  relatedWords: {
    type: [String] // Array of related words instead of ObjectId references
  },
  tags: {
    type: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Expression = mongoose.model("Expression", expressionSchema);

export default Expression;
