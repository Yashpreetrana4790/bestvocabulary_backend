import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
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
  },
  options: [
    {
      type: mongoose.Schema.Types.Mixed, // Accepts both string and object
      required: true
    }
  ]
});

const Question = mongoose.model("Question", questionSchema);
export default Question;
