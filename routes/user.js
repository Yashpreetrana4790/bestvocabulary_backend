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
    console.log("Registration attempt:", email, fullName, password, confirmPassword);

    // Validate request body using registerSchema
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      console.log("Validation error", result.error.errors);
      return res.status(400).json({
        error: 'Validation Error',
        details: result.error.errors
      });
    }

    if (password !== confirmPassword) {
      console.log("Passwords do not match");
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Passwords do not match'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists");
      return res.status(400).json({
        error: 'User already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      email,
      fullName,
      password: hashedPassword,
      role: "student"
    });

    console.log("User created successfully", newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '1h' } // Token expiration time
    );

    console.log("Token generated successfully", token);

    // Send success response with token
    return res.status(201).json({
      status: true,
      message: 'User created successfully',
      token, // Send the token
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate Key Error',
        message: 'A user with this email already exists'
      });
    }

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







export default router;




