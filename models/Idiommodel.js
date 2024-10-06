import mongoose from "mongoose";
import exampleSchema from "./examplesmodel.js";
const { Schema } = mongoose;



const idiomSchema = new Schema({
  idiom: { type: String, required: true },
  meanings: [
    {
      meaningsubtype: { type: String, required: true },
      definition: { type: String, required: true },
      examples: [exampleSchema],
      synonyms: [{ type: String }],
      antonyms: [{ type: String }],
    }
  ],
  words: [{ type: Schema.Types.ObjectId, ref: 'Word' }], // Array of references to Word models
}, { timestamps: true });


const Idiom = mongoose.model('Idiom', idiomSchema);
export default Idiom;
