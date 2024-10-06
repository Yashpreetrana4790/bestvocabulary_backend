import mongoose from 'mongoose';
import exampleSchema from './examplesmodel.js';
const { Schema } = mongoose;


const meaningSchema = new Schema({
  meaningsubtype: { type: String, required: true },
  partOfSpeech: { type: String },
  definition: { type: String, required: true },
  examples: [exampleSchema],
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
})


const wordSchema = new Schema({
  word: { type: String, required: true, unique: true },
  pronunciation: { type: String },
  level: { type: String, enum: ["Pro", "Elementary", "MiddleSchool", "HighSchool", "CollegeUniversity"], required: true },
  idioms: [{ type: Schema.Types.ObjectId, ref: 'Idiom', default: undefined }],
  phrases: [{ type: Schema.Types.ObjectId, ref: 'Phrase', default: undefined }],
  level: { type: String, enum: ['Pro', 'Elementary', 'MiddleSchool', 'HighSchool', 'CollegeUniversity'], required: true },
  meanings: [meaningSchema],
}, { timestamps: true });


const Words = mongoose.model('Words', wordSchema);

export default Words;
