import mongoose from "mongoose";
import exampleSchema from "./examplesmodel.js";
const { Schema } = mongoose;



const idiomSchema = new Schema({
  phrase: { type: String, required: true },
  definition: { type: String, required: true },
  examples: [exampleSchema], // Array of example sentences
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
  words: [{ type: Schema.Types.ObjectId, ref: 'Word' }], // Array of references to Word models
}, { timestamps: true });

// Export the model
const Idiom = mongoose.model('Idiom', idiomSchema);
export default Idiom;
