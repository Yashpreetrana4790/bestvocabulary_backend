import express from 'express';
import z from 'zod';
import jwt from 'jsonwebtoken';
import extractToken from '../middleware.js';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config.js';
import User from '../models/usermodel.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
})



const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});



const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6),
});



router.post('/register', async (req, res) => {
  try {
    const { email, fullName, password, confirmPassword } = req.body;

    if (!email || !fullName || !password || !confirmPassword) {
      console.log("All fields are required");
      return res.status(400).json({
        error: 'Validation Error',
        message: 'All fields are required'
      });
    }


    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      console.log("Validation error", validation.error.errors);
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors
      });
    }


    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Passwords do not match'
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    console.log("existingUser:", existingUser);
    if (existingUser) {

      console.log("User already exists:", existingUser.email);
      return res.status(400).json({
        error: 'User already exists'
      });
    }

 
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("hashedPassword:", hashedPassword);

 
    const newUser = await User.create({
      email,
      fullName,
      password: hashedPassword,
      role: "student"
    });

    if (!newUser) {
      return res.status(400).json({
        error: 'Failed to create user'
      });
    }


    const token = generateToken(newUser._id, newUser.email);

    return res.status(201).json({
      status: true,
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("MongoDB error:", error);

    if (error.code === 11000) {
      console.log("Duplicate key value:", error.keyValue);
      return res.status(400).json({
        error: 'Duplicate Key Error',
        message: `A user with this ${Object.keys(error.keyValue)[0]} already exists`
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }

});


const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};





router.post('/login', async (req, res) => {
  try {
    const body = req.body;

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return res.status(400).send('Invalid request');
    }

    const { email, password } = body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ "message": 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});




router.post('/change-password', extractToken, async (req, res) => {
  try {
    const body = req.body;

    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      return res.status(400).send('Invalid request');
    }

    const { oldPassword, newPassword } = body;
    const user = await User.findById(req.user.id);



    if (!user) {
      return res.status(401).send('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid old password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});


router.get('/allusers', async (req, res) => {
  try {
    const user = await User.find().select('-password' - '__v' - 'createdAt' - 'updatedAt');
    if (!user) {
      return res.status(404).send('Users not found');
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Get current user profile
router.get('/profile', extractToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('savedWords', 'word pronunciation meanings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        savedWords: user.savedWords || [],
        progress: user.progress || {
          wordsLearned: 0,
          categoriesCompleted: 0,
          streak: 0
        }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Save word to user's saved words
router.post('/save-word/:wordId', extractToken, async (req, res) => {
  try {
    const { wordId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if word is already saved
    if (user.savedWords && user.savedWords.includes(wordId)) {
      return res.status(400).json({ message: 'Word already saved' });
    }

    if (!user.savedWords) {
      user.savedWords = [];
    }
    user.savedWords.push(wordId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Word saved successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Remove word from saved words
router.delete('/save-word/:wordId', extractToken, async (req, res) => {
  try {
    const { wordId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.savedWords) {
      user.savedWords = [];
    }
    user.savedWords = user.savedWords.filter(id => id.toString() !== wordId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Word removed from saved words'
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get saved words
router.get('/saved-words', extractToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedWords',
        select: 'word pronunciation meanings frequency'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      words: user.savedWords || []
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;




