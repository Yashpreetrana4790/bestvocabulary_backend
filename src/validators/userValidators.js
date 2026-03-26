import z from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const loginGoogleSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const validateRegister = (data) => {
  return registerSchema.safeParse(data);
};

export const validateLogin = (data) => {
  return loginSchema.safeParse(data);
};

export const validateLoginGoogle = (data) => {
  return loginGoogleSchema.safeParse(data);
};

export const validateChangePassword = (data) => {
  return changePasswordSchema.safeParse(data);
};

export const validateRefreshToken = (data) => {
  return refreshTokenSchema.safeParse(data);
};

export default {
  registerSchema,
  loginSchema,
  loginGoogleSchema,
  changePasswordSchema,
  refreshTokenSchema,
  validateRegister,
  validateLogin,
  validateLoginGoogle,
  validateChangePassword,
  validateRefreshToken,
};

