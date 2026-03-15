import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import {
  validateRegister,
  validateLogin,
  validateLoginGoogle,
  validateChangePassword,
} from '../validators/userValidators.js';
import {
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
} from '../services/userService.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/auth.js';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * @route   POST /api/v1/user/register
 * @desc    Register a new user. If body looks like login (only email + password), run login instead
 *          so wrong URL still works.
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const hasLoginShape = body.email != null && body.password != null && body.fullName == null && body.confirmPassword == null;

    if (hasLoginShape) {
      const validation = validateLogin(body);
      if (!validation.success) {
        return res.status(422).json({
          success: false,
          message: 'Invalid request',
          errors: validation.error.errors,
        });
      }
      const result = await loginUser(body);
      return successResponse(res, result, 'Login successful');
    }

    const validation = validateRegister(body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors,
      });
    }

    const result = await registerUser(body);
    return successResponse(res, result, 'User created successfully', 201);
  })
);

/**
 * @route   POST /api/v1/user/login
 * @desc    Login user (email + password). Returns "Invalid credentials" if not found or wrong password.
 *          Never returns "User already exists" – that is only from POST /register.
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const validation = validateLogin(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const result = await loginUser(req.body);
    return successResponse(res, result, 'Login successful');
  })
);

/**
 * @route   POST /api/v1/user/login/google
 * @desc    Login or register with Google id_token
 * @access  Public
 */
router.post(
  '/login/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const validation = validateLoginGoogle(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const credential = req.body?.credential;
    const idToken = credential != null && typeof credential === 'string' ? credential.trim() : '';
    if (!idToken) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: [{ path: ['credential'], message: 'Google credential is required' }],
      });
    }
    const result = await loginUserGoogle(idToken);
    return successResponse(res, result, 'Login successful');
  })
);

/**
 * @route   POST /api/v1/user/change-password
 * @desc    Change user password (pass userId in body when auth is disabled)
 * @access  Public
 */
router.post(
  '/change-password',
  asyncHandler(async (req, res) => {
    const validation = validateChangePassword(req.body);
    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: 'Invalid request',
        errors: validation.error.errors,
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required in request body',
      });
    }
    await changeUserPassword(userId, req.body);
    return successResponse(res, null, 'Password changed successfully');
  })
);

/**
 * @route   GET /api/v1/user/auth/google
 * @desc    Server-side OAuth: redirect user to Google sign-in. Callback goes to /auth/google/callback.
 * @access  Public
 */
router.get(
  '/auth/google',
  asyncHandler(async (req, res) => {
    const backendHost = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const callbackUri = `${backendHost.replace(/\/$/, '')}/api/v1/user/auth/google/callback`;
    const result = await getGoogleAuthUrl(callbackUri);
    if (!result?.url) {
      return res.status(503).json({
        success: false,
        message: 'Google sign-in is not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)',
      });
    }
    res.redirect(result.url);
  })
);

/**
 * @route   GET /api/v1/user/auth/google/callback
 * @desc    Google OAuth callback: exchange code for tokens, create/find user, redirect to frontend with JWT.
 * @access  Public
 */
router.get(
  '/auth/google/callback',
  asyncHandler(async (req, res) => {
    const backendHost = process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const callbackUri = `${backendHost.replace(/\/$/, '')}/api/v1/user/auth/google/callback`;
    const code = req.query?.code;
    const frontendUrl = (config.frontendUrl || 'http://localhost:3000').replace(/\/$/, '');

    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=missing_code`);
    }

    try {
      const { token, user, isNewUser } = await handleGoogleOAuthCallback(code, callbackUri);
      const callbackPath = '/auth/callback';
      const tokenParam = encodeURIComponent(token);
      const userParam = encodeURIComponent(JSON.stringify(user));
      const newUserParam = isNewUser ? '&isNewUser=1' : '';
      res.redirect(`${frontendUrl}${callbackPath}?token=${tokenParam}&user=${userParam}${newUserParam}`);
    } catch (err) {
      const message = err.message || 'Google sign-in failed';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }
  })
);

/**
 * @route   GET /api/v1/user/me
 * @desc    Get current user (requires auth)
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return successResponse(res, user, 'User retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/user/allusers
 * @desc    Get all users
 * @access  Public
 */
router.get(
  '/allusers',
  asyncHandler(async (req, res) => {
    const users = await getAllUsers();
    return successResponse(res, users, 'Users retrieved successfully');
  })
);

/**
 * @route   GET /api/v1/user/saved-words
 * @desc    Get current user's saved words (requires auth)
 * @access  Private
 */
router.get(
  '/saved-words',
  authenticate,
  asyncHandler(async (req, res) => {
    const list = await getSavedWords(req.user.userId);
    return successResponse(res, list, 'Saved words retrieved successfully');
  })
);

/**
 * @route   POST /api/v1/user/saved-words
 * @desc    Add a word to current user's saved words (requires auth). Body: { wordId }
 * @access  Private
 */
router.post(
  '/saved-words',
  authenticate,
  asyncHandler(async (req, res) => {
    const wordId = req.body?.wordId;
    if (!wordId) {
      return res.status(400).json({
        success: false,
        message: 'wordId is required',
      });
    }
    const result = await addSavedWord(req.user.userId, wordId);
    return successResponse(res, result, result.added ? 'Word saved' : 'Already saved', result.added ? 201 : 200);
  })
);

/**
 * @route   DELETE /api/v1/user/saved-words/:wordId
 * @desc    Remove a word from current user's saved words (requires auth)
 * @access  Private
 */
router.delete(
  '/saved-words/:wordId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await removeSavedWord(req.user.userId, req.params.wordId);
    return successResponse(res, result, result.removed ? 'Word removed from saved' : 'Word was not in saved list');
  })
);

export default router;
