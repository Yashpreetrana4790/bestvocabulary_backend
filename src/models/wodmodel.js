import mongoose from "mongoose";


const WordOfTheDaySchema = new mongoose.Schema({
  word: { type: mongoose.Schema.Types.ObjectId, ref: "Word", required: true },
  date: { type: String, required: true, unique: true }, // Store date to prevent duplicate updates
});


const Wod = mongoose.model("Wod", WordOfTheDaySchema);
export default Wod;
