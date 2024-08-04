import express from 'express';
import z from 'zod';
import jwt from 'jsonwebtoken';
import extractToken from '../middleware.js';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config.js';
import User from '../models/usermodel.js';

const router = express.Router();

const registerSchema = z.object({
  username: z.string(),
  fullName: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
})



const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});



const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6),
});



router.post('/register', async (req, res) => {
  try {
    const { username, fullName, password, confirmPassword } = req.body;
    console.log("Registration attempt:", username, fullName, password, confirmPassword);

    // Validate request body using registerSchema
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: result.error.errors
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Passwords do not match'
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username,
      fullName,
      password: hashedPassword,
      role: "student"
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '1h' } // Token expiration time
    );

    // Send success response with token
    return res.status(201).json({
      message: 'User created successfully',
      token, // Send the token
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});



router.post('/login', async (req, res) => {
  try {
    const body = req.body;

    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return res.status(400).send('Invalid request');
    }

    const { username, password } = body;
    const user = await User.findOne({ username });

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







export default router;




