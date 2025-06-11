const { validationResult } = require('express-validator');
const { ApiError } = require('./error.middleware');

/**
 * Middleware to validate request using express-validator
 * @param {Array} validations - Array of validation rules
 * @returns {Function} Express middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));

    // Throw API error with validation errors
    next(new ApiError(400, 'Validation Error', formattedErrors));
  };
};

module.exports = {
  validate
}; 