import mongoose from 'mongoose';
const { Schema } = mongoose;

const exampleSchema = new Schema({
  sentence: { type: String, required: true },
});

export default exampleSchema;
