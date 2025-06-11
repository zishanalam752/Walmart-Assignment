const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};

// Device verification middleware
const verifyDevice = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
      throw new ApiError(400, 'Device ID is required');
    }

    // Check if device is registered for user
    const user = await User.findById(req.user.id);
    const isDeviceRegistered = user.registeredDevices.includes(deviceId);

    if (!isDeviceRegistered) {
      // For offline mode, we might want to allow unregistered devices
      if (process.env.OFFLINE_MODE_ENABLED === 'true') {
        // Register device for offline use
        user.registeredDevices.push(deviceId);
        await user.save();
      } else {
        throw new ApiError(401, 'Device not registered');
      }
    }

    req.deviceId = deviceId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  authorize,
  verifyDevice
}; 