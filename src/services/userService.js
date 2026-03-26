import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { config } from '../config/env.js';
import User from '../models/usermodel.js';
import Word from '../models/wordmodel.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function issueTokenPair(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };
  return {
    token: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Exchange a valid refresh JWT for new access + refresh tokens.
 */
export const refreshUserSession = async (refreshTokenRaw) => {
  const refreshToken =
    refreshTokenRaw != null && typeof refreshTokenRaw === 'string' ? refreshTokenRaw.trim() : '';
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded?.userId) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
  const pair = issueTokenPair(user);
  return {
    ...pair,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

/** Create OAuth2Client for server-side code flow (uses client secret) */
function getOAuth2ClientForCodeFlow(redirectUri) {
  const { clientId, clientSecret } = config.google || {};
  if (!clientId || !clientSecret) return null;
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/**
 * Find or create user from Google payload (shared by id_token and code flow)
 * @returns {Promise<{ user: Model, isNewUser: boolean }>}
 */
async function getOrCreateUserFromGoogle(googleId, email, name) {
  const emailLower = email.toLowerCase().trim();
  const fullName = (name || emailLower).trim() || 'User';

  let user = await User.findOne({ googleId });
  let isNewUser = false;
  if (!user) {
    user = await User.findOne({ email: emailLower });
    if (user) {
      user.googleId = googleId;
      await user.save();
      logger.info(`Linked Google account for: ${user.email}`);
    } else {
      user = await User.create({
        email: emailLower,
        username: emailLower,
        fullName,
        googleId,
        role: 'student',
      });
      isNewUser = true;
      logger.info(`User registered via Google: ${user.email}`);
    }
  }
  return { user, isNewUser };
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and token
 */
export const registerUser = async (userData) => {
  const { fullName, password, confirmPassword } = userData;
  const email = (userData.email && typeof userData.email === 'string')
    ? userData.email.trim().toLowerCase()
    : '';

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    throw new BadRequestError('Passwords do not match');
  }

  // Check for existing user (always by lowercase email)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn(`Registration attempt with existing email: ${email}`);
    throw new BadRequestError('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user (username = email so unique index is satisfied; DB may have old username_1 index)
  const newUser = await User.create({
    email,
    username: email,
    fullName: (fullName && typeof fullName === 'string') ? fullName.trim() : 'User',
    password: hashedPassword,
    role: 'student',
  });

  if (!newUser) {
    throw new BadRequestError('Failed to create user');
  }

  const { token, refreshToken } = issueTokenPair(newUser);

  logger.info(`User registered successfully: ${newUser.email}`);

  return {
    user: {
      id: newUser._id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    },
    token,
    refreshToken,
  };
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @returns {Promise<Object>} User and token
 */
export const loginUser = async (credentials) => {
  const email = (credentials.email && typeof credentials.email === 'string')
    ? credentials.email.trim().toLowerCase()
    : '';
  const password = credentials.password;

  if (!email || password == null || password === '') {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Find user (always by lowercase email)
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.password) {
    throw new UnauthorizedError('This account uses Google sign-in. Please sign in with Google.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Failed login attempt for: ${email}`);
    throw new UnauthorizedError('Invalid credentials');
  }

  const { token, refreshToken } = issueTokenPair(user);

  logger.info(`User logged in successfully: ${user.email}`);

  return {
    message: 'Login successful',
    token,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

/**
 * Login or register user with Google id_token
 * @param {string} idToken - Google ID token string from frontend
 * @returns {Promise<Object>} User and token
 */
export const loginUserGoogle = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new BadRequestError('Google sign-in is not configured');
  }
  const tokenString = idToken != null && typeof idToken === 'string' ? String(idToken).trim() : '';
  if (!tokenString) {
    throw new UnauthorizedError('Invalid Google token');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: tokenString,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError('Invalid Google token');
  }
  const { sub: googleId, email, name } = payload;
  const { user, isNewUser } = await getOrCreateUserFromGoogle(googleId, email, name);

  const { token, refreshToken } = issueTokenPair(user);

  return {
    message: isNewUser ? 'Account created' : 'Login successful',
    token,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    isNewUser,
  };
};

/**
 * Server-side OAuth: get Google authorization URL to redirect the user to
 * @param {string} redirectUri - Backend callback URL (must match Google Console)
 * @returns {Promise<{ url: string } | null>}
 */
export async function getGoogleAuthUrl(redirectUri) {
  const client = getOAuth2ClientForCodeFlow(redirectUri);
  if (!client) return null;
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });
  return { url };
}

/**
 * Server-side OAuth: exchange authorization code for tokens, find/create user, return our JWT
 * @param {string} code - Authorization code from Google callback
 * @param {string} redirectUri - Same redirect_uri used when generating the auth URL
 * @returns {Promise<{ token, user }>}
 */
export async function handleGoogleOAuthCallback(code, redirectUri) {
  const client = getOAuth2ClientForCodeFlow(redirectUri);
  if (!client) {
    throw new BadRequestError('Google OAuth is not configured (client secret required)');
  }
  const { tokens } = await client.getToken(code);
  if (!tokens || !tokens.id_token) {
    throw new UnauthorizedError('Invalid Google authorization code');
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError('Invalid Google token');
  }
  const { sub: googleId, email, name } = payload;
  const { user, isNewUser } = await getOrCreateUserFromGoogle(googleId, email, name);

  const { token, refreshToken } = issueTokenPair(user);

  return {
    token,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    isNewUser,
  };
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {Object} passwordData - Old and new passwords
 * @returns {Promise<void>}
 */
export const changeUserPassword = async (userId, passwordData) => {
  const { oldPassword, newPassword } = passwordData;

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.password) {
    throw new BadRequestError('This account uses Google sign-in. Set a password from your profile first.');
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid old password');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);
};

/**
 * Get user by ID (for /me)
 * @param {string} userId - User ID from JWT
 * @returns {Promise<Object|null>} User without password
 */
export const getUserById = async (userId) => {
  if (!userId) return null;
  const user = await User.findById(userId).select('-password -__v -googleId').lean();
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
};

/**
 * Get all users
 * @returns {Promise<Array>} List of users
 */
export const getAllUsers = async () => {
  const users = await User.find().select('-password -__v -createdAt -updatedAt').lean();
  return users;
};

/**
 * Get user's saved words (populated with word details)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Saved words with word, pronunciation, meaning, savedAt
 */
export const getSavedWords = async (userId) => {
  const user = await User.findById(userId).populate({
    path: 'savedWords',
    select: 'word pronunciation meanings',
  }).lean();
  if (!user || !user.savedWords) return [];
  return (user.savedWords || []).map((w) => ({
    wordId: w._id,
    word: w.word,
    pronunciation: w.pronunciation || '',
    meaning: w.meanings?.[0]?.meaning || w.meanings?.[0]?.subtitle || '',
  }));
};

/**
 * Add a word to user's saved words
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID (MongoDB ObjectId)
 * @returns {Promise<Object>} Updated user savedWords count or added word
 */
const MAX_SAVED_WORDS = 500;

export const addSavedWord = async (userId, wordId) => {
  const word = await Word.findById(wordId);
  if (!word) throw new NotFoundError('Word not found');
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  const idStr = wordId.toString();
  if (user.savedWords.some((id) => id.toString() === idStr)) {
    return { added: false, word: word.word };
  }
  if (user.savedWords.length >= MAX_SAVED_WORDS) {
    throw new BadRequestError(`You can save up to ${MAX_SAVED_WORDS} words. Remove some to add more.`);
  }
  user.savedWords.push(wordId);
  await user.save();
  logger.info(`User ${userId} saved word: ${word.word}`);
  return {
    added: true,
    word: word.word,
    wordId: word._id,
  };
};

/**
 * Remove a word from user's saved words
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID (MongoDB ObjectId)
 * @returns {Promise<Object>} { removed: boolean }
 */
export const removeSavedWord = async (userId, wordId) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  const before = user.savedWords.length;
  user.savedWords.pull(wordId);
  if (user.savedWords.length === before) {
    return { removed: false };
  }
  await user.save();
  logger.info(`User ${userId} removed saved word: ${wordId}`);
  return { removed: true };
};

export default {
  registerUser,
  loginUser,
  loginUserGoogle,
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  changeUserPassword,
  getUserById,
  getAllUsers,
  getSavedWords,
  addSavedWord,
  removeSavedWord,
  refreshUserSession,
};

