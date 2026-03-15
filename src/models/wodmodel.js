import mongoose from "mongoose";

const WordOfTheDaySchema = new mongoose.Schema({
  word: { type: mongoose.Schema.Types.ObjectId, ref: "Word", required: true },
  date: { type: Date, required: true, unique: true },
}, {
  timestamps: true
});

// Index for efficient date queries
WordOfTheDaySchema.index({ date: -1 });

const Wod = mongoose.model("Wod", WordOfTheDaySchema);
export default Wod;
