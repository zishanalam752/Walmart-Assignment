const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const User = require('../models/user.model');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('preferredLanguage').optional().isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english'])
];

const validateLogin = [
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password').exists().withMessage('Password is required')
];

// Register new user
router.post('/register',
  validateRegistration,
  asyncHandler(async (req, res) => {
    const { name, phone, email, password, preferredLanguage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      throw new ApiError(400, 'User with this phone or email already exists');
    }

    // Create new user
    const user = await User.create({
      name,
      phone,
      email,
      password,
      preferredLanguage: preferredLanguage || 'hindi'
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user,
        token
      }
    });
  })
);

// Login user
router.post('/login',
  validateLogin,
  asyncHandler(async (req, res) => {
    const { phone, password, deviceId } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid phone number or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid phone number or password');
    }

    // Update last login
    await user.updateLastLogin();

    // Register device if provided
    if (deviceId) {
      await user.addDevice(deviceId);
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user,
        token
      }
    });
  })
);

// Get current user
router.get('/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  })
);

// Update user profile
router.patch('/me',
  authMiddleware,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail(),
    body('preferredLanguage').optional().isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english']),
    body('voicePreferences').optional().isObject(),
    body('address').optional().isObject()
  ],
  asyncHandler(async (req, res) => {
    const allowedUpdates = ['name', 'email', 'preferredLanguage', 'voicePreferences', 'address'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  })
);

// Logout user (remove device)
router.post('/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) {
      throw new ApiError(400, 'Device ID is required');
    }

    const user = await User.findById(req.user.id);
    await user.removeDevice(deviceId);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  })
);

// Request password reset
router.post('/forgot-password',
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const user = await User.findOne({ phone });

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        status: 'success',
        message: 'If your phone number is registered, you will receive a reset code'
      });
    }

    // Generate reset code (6 digits)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store reset code in user document (in production, use a separate collection with expiry)
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // In production, send code via SMS
    // For development, return code in response
    res.status(200).json({
      status: 'success',
      message: 'Reset code sent to your phone',
      // Remove in production
      data: { resetCode }
    });
  })
);

// Reset password
router.post('/reset-password',
  [
    body('phone').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Invalid reset code'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],
  asyncHandler(async (req, res) => {
    const { phone, code, newPassword } = req.body;

    const user = await User.findOne({
      phone,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset code');
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  })
);

module.exports = router; 