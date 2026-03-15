import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
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
    default: '#3b82f6'
  },
  icon: {
    type: String
  },
  image: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  words: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

categorySchema.index({ name: 'text', description: 'text' });

const Category = mongoose.model("Category", categorySchema);
export default Category;
