import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'admin'],
    default: 'student'
  },  
  savedQuestions: [{
    type: Schema.Types.ObjectId,
    ref: 'Question'
  }],
  savedWords: [{
    type: Schema.Types.ObjectId,
    ref: 'Word'
  }],
  progress: {
    wordsLearned: { type: Number, default: 0 },
    categoriesCompleted: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActivity: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }

});

// Create the User model
const User = mongoose.model('User', userSchema);

export default User;
