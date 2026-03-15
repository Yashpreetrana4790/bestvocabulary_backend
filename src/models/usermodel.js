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
  username: {
    type: String,
    required: false,
    sparse: true,
    unique: true,
    default: null
  },
  password: {
    type: String,
    required: false,
    minlength: 6,
    default: null
  },
  googleId: {
    type: String,
    required: false,
    sparse: true,
    unique: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }

});

// Create the User model
const User = mongoose.model('User', userSchema);

export default User;
