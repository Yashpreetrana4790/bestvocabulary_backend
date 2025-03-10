import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple-choice", "fill-in-the-blank", "scenario-based"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  hint: {
    type: String
  },
  category: {
    type: String
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true
  },
  options: {
    type: [String], // Ensures it's an array of strings
    default: [] // Allows empty arrays for non-multiple-choice questions
  }
});

const Question = mongoose.model("Question", questionSchema);
export default Question;
