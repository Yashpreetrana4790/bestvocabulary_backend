import mongoose from 'mongoose';
import exampleSchema from './examplesmodel.js';
const { Schema } = mongoose;


const phraseSchema = new Schema({
  phrase: { type: String, required: true },
  meanings: [
    {
      meaningsubtype: { type: String, required: true },
      definition: { type: String, required: true },
      examples: [exampleSchema],
      synonyms: [{ type: String }],
      antonyms: [{ type: String }],
    }
  ],
  examples: [exampleSchema],
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
}, { timestamps: true });

// Create the Phrase model
const Phrase = mongoose.model('Phrase', phraseSchema);
export default Phrase;
