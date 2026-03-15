import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { generateToken } from '../config/jwt.js';
import { config } from '../config/env.js';
import User from '../models/usermodel.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  // Generate token
  const token = generateToken({
    userId: newUser._id,
    email: newUser.email,
  });

  logger.info(`User registered successfully: ${newUser.email}`);

  return {
    user: {
      id: newUser._id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    },
    token,
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

  // Generate token
  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  logger.info(`User logged in successfully: ${user.email}`);

  return {
    message: 'Login successful',
    token,
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

  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  return {
    message: isNewUser ? 'Account created' : 'Login successful',
    token,
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

  const token = generateToken({
    userId: user._id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
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

export default {
  registerUser,
  loginUser,
  loginUserGoogle,
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  changeUserPassword,
  getUserById,
  getAllUsers,
};

