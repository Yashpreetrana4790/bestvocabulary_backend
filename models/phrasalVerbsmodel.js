import mongoose from "mongoose";

const { Schema } = mongoose;

// Phrasal Verb Schema
const phrasalVerbSchema = new Schema({
  phrase: { type: String, required: true, unique: true },
  meaning: { type: String, required: true },
  example_sentences: [{ type: String }],
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
  relatedWords: [{ type: String }],
});

const PhrasalVerb = mongoose.model("PhrasalVerb", phrasalVerbSchema);

export default PhrasalVerb;
