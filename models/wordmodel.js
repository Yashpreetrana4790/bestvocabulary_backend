import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the example schema
export const exampleSchema = new Schema({
  sentence: { type: String, required: true },
});

// Define the meaning schema
const meaningSchema = new Schema({
  meaningsubtype: { type: String, required: true },
  definition: { type: String, required: true },
  examples: [exampleSchema],
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
});

// Define the Word schema
const wordSchema = new Schema({
  word: { type: String, required: true, unique: true },
  pronunciation: { type: String },
  partOfSpeech: { type: String },
  idioms: [{ type: Schema.Types.ObjectId, ref: 'Idiom' }], 
  phrases: [{ type: Schema.Types.ObjectId, ref: 'Phrase' }], 
  meanings: [meaningSchema],
}, { timestamps: true });

// Create the Word model
const Word = mongoose.model('Word', wordSchema);

export default Word;
