const express = require('express');
const { body, query } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { authMiddleware, authorize, protect } = require('../middleware/auth.middleware');
const Product = require('../models/product.model');
const chatgptService = require('../services/chatgpt.service');

const router = express.Router();

// Validation middleware
const validateProduct = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('unit').isIn(['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'pack']).withMessage('Invalid unit'),
  body('category').isIn(['groceries', 'vegetables', 'fruits', 'dairy', 'meat', 'bakery', 'household', 'personal_care']).withMessage('Invalid category'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('location.coordinates').isArray().withMessage('Coordinates must be an array'),
  body('location.coordinates.*').isFloat().withMessage('Invalid coordinate value'),
  body('location.address').isObject().withMessage('Address must be an object'),
  body('alternativeNames').optional().isArray().withMessage('Alternative names must be an array'),
  body('voiceDescriptions').optional().isArray().withMessage('Voice descriptions must be an array'),
  body('unitNames').optional().isArray().withMessage('Unit names must be an array'),
  body('voicePatterns').optional().isArray().withMessage('Voice patterns must be an array')
];

// Validation middleware for query parameters
const validateProductQuery = [
  query('category').optional().isIn(['groceries', 'vegetables', 'fruits', 'dairy', 'meat', 'bakery', 'household', 'personal_care']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('language').optional().isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english']),
  query('dialect').optional().isIn(['standard', 'colloquial']),
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0 }),
  query('pincode').optional().isString(),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

// Get low stock products (admin only) - Must come before /:id route
router.get('/admin/low-stock',
  authMiddleware,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const products = await Product.find({
      'stock.quantity': { $lte: '$stock.lowStockThreshold' },
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      data: { products }
    });
  })
);

// Process voice commands for products - Must come before /:id route
router.post('/voice',
  asyncHandler(async (req, res) => {
    const { voiceCommand, language, context } = req.body;

    // Process voice command using ChatGPT service
    const processedCommand = await chatgptService.processVoiceCommand(
      voiceCommand,
      context
    );

    res.status(200).json({
      status: 'success',
      data: { processedCommand }
    });
  })
);

// Product routes
router.route('/')
  // Get all products with filters
  .get(validateProductQuery, asyncHandler(async (req, res) => {
    const {
      category,
      minPrice,
      maxPrice,
      language,
      dialect,
      lat,
      lng,
      radius,
      pincode,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    // Location filter
    if (lat && lng && radius) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      };
    } else if (pincode) {
      query['location.address.pincode'] = pincode;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'alternativeNames.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate('merchant', 'name phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Transform response based on language preference
    const transformedProducts = products.map(product => {
      const transformed = product.toObject();
      if (language) {
        transformed.voiceName = product.getVoiceName(language, dialect);
        transformed.voiceUnit = product.getVoiceUnit(language, dialect);
        const voiceDesc = product.voiceDescriptions.find(
          desc => desc.language === language && desc.dialect === dialect
        );
        if (voiceDesc) {
          transformed.voiceDescription = voiceDesc.description;
        }
      }
      return transformed;
    });

    res.status(200).json({
      status: 'success',
      data: {
        products: transformedProducts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  }))
  // Create new product (merchant only)
  .post(
    authMiddleware,
    authorize('merchant', 'admin'),
    validateProduct,
    asyncHandler(async (req, res) => {
      const product = await Product.create({
        ...req.body,
        merchant: req.user.id
      });

      res.status(201).json({
        status: 'success',
        data: { product }
      });
    })
  );

// Product by ID routes
router.route('/:id')
  // Get product by ID
  .get(asyncHandler(async (req, res) => {
    const { language, dialect } = req.query;
    const product = await Product.findById(req.params.id)
      .populate('merchant', 'name phone')
      .populate('reviews.user', 'name');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const transformed = product.toObject();
    if (language) {
      transformed.voiceName = product.getVoiceName(language, dialect);
      transformed.voiceUnit = product.getVoiceUnit(language, dialect);
      const voiceDesc = product.voiceDescriptions.find(
        desc => desc.language === language && desc.dialect === dialect
      );
      if (voiceDesc) {
        transformed.voiceDescription = voiceDesc.description;
      }
    }

    res.status(200).json({
      status: 'success',
      data: { product: transformed }
    });
  }))
  // Update product (merchant only)
  .patch(
    authMiddleware,
    authorize('merchant', 'admin'),
    validateProduct,
    asyncHandler(async (req, res) => {
      const product = await Product.findOne({
        _id: req.params.id,
        merchant: req.user.id
      });

      if (!product) {
        throw new ApiError(404, 'Product not found or you do not have permission to update it');
      }

      Object.assign(product, req.body);
      await product.save();

      res.status(200).json({
        status: 'success',
        data: { product }
      });
    })
  )
  // Delete product (merchant only)
  .delete(
    authMiddleware,
    authorize('merchant', 'admin'),
    asyncHandler(async (req, res) => {
      const product = await Product.findOne({
        _id: req.params.id,
        merchant: req.user.id
      });

      if (!product) {
        throw new ApiError(404, 'Product not found or you do not have permission to delete it');
      }

      // Soft delete
      product.isActive = false;
      await product.save();

      res.status(200).json({
        status: 'success',
        data: { product }
      });
    })
  );

// Add review to product
router.post('/:id/reviews',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    await product.addReview(req.user._id, rating, comment);

    res.status(200).json({
      status: 'success',
      data: { product }
    });
  })
);

module.exports = router; 