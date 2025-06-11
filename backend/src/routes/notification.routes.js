const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { body } = require('express-validator');
const { ApiError } = require('../middleware/error.middleware');
const notificationService = require('../services/notification.service');
const User = require('../models/user.model');

// Get user's unread notifications
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user._id);
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});

// Mark notifications as read
router.post('/mark-read', authMiddleware, validate([
  body('notificationIds')
    .isArray()
    .withMessage('Notification IDs must be an array')
    .notEmpty()
    .withMessage('Notification IDs cannot be empty')
]), async (req, res, next) => {
  try {
    await notificationService.markNotificationsAsRead(
      req.user._id,
      req.body.notificationIds
    );

    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

// Clear old notifications
router.delete('/clear-old', authMiddleware, validate([
  body('days')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Days must be between 1 and 90')
]), async (req, res, next) => {
  try {
    await notificationService.clearOldNotifications(
      req.user._id,
      req.body.days || 30
    );

    res.json({
      success: true,
      message: 'Old notifications cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('notificationPreferences');

    res.json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.patch('/preferences', authMiddleware, validate([
  body('preferences')
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.orderUpdates')
    .optional()
    .isBoolean()
    .withMessage('Order updates preference must be a boolean'),
  body('preferences.voiceInteractions')
    .optional()
    .isBoolean()
    .withMessage('Voice interactions preference must be a boolean'),
  body('preferences.systemUpdates')
    .optional()
    .isBoolean()
    .withMessage('System updates preference must be a boolean'),
  body('preferences.offlineSync')
    .optional()
    .isBoolean()
    .withMessage('Offline sync preference must be a boolean')
]), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'notificationPreferences': req.body.preferences
        }
      },
      { new: true }
    ).select('notificationPreferences');

    res.json({
      success: true,
      data: user.notificationPreferences
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 