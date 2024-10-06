import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true // This ensures that emails are unique
  },
  password: {
    type: String,
    required: true,
    minlength: 6 // Minimum length for password
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'admin'], // Adjust roles as needed
    default: 'student'
  }
});

// Create the User model
const User = mongoose.model('User', userSchema);

export default User;
