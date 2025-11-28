import mongoose from "mongoose";

const { Schema } = mongoose;

// Category Schema - for organizing words into categories like "Biology", "Science", etc.
const categorySchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  color: { 
    type: String,
    default: '#3b82f6' // Default blue color
  },
  icon: {
    type: String, // Icon name or emoji
    default: '📚'
  },
  image: {
    type: String, // Image URL (Cloudinary URL)
    default: null
  },
  words: [{
    type: Schema.Types.ObjectId,
    ref: 'Word'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{ type: String }]
}, {
  timestamps: true
});

// Index for faster searches
categorySchema.index({ name: 'text', description: 'text' });

const Category = mongoose.model("Category", categorySchema);

export default Category;

