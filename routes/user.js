import express from 'express';
import { Account, User } from '../db.js';
import z from 'zod';
import jwt from 'jsonwebtoken';
import extractToken from '../middleware.js';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config.js';

const router = express.Router();

const signupSchema = z.object({
  username: z.string(),
  firstname: z.string(),
  lastname: z.string().optional(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Set the path of the error
});

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(6),
});

const generateRandomBalance = () => {
  return Math.floor(Math.random() * 1000) + 1; // Random balance between 1 and 1000
};

router.post('/signup', async (req, res) => {
  try {
    const body = req.body;
    console.log("hurray")

    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return res.status(400).send('Validation Error');
    }

    const existingUser = await User.findOne({ username: body.username });
    1
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const newUser = await User.create({ ...body, password: hashedPassword });
    const randomBalance = generateRandomBalance();
    const newAccount = await Account.create({ userId: newUser._id, balance: randomBalance });
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1h' });
    const { _id } = newUser
    return res.status(200).json({ message: 'User created successfully', token, Id: _id });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = req.body;

    const result = signinSchema.safeParse(body);
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




