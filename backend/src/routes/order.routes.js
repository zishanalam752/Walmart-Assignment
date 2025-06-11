const express = require('express');
const { body, query } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { authMiddleware, authorize, verifyDevice } = require('../middleware/auth.middleware');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const voiceService = require('../services/voice.service');
const chatGPTService = require('../services/chatgpt.service');

const router = express.Router();

// Validation middleware
const validateVoiceOrder = [
  body('voiceCommand').isString().notEmpty().withMessage('Voice command is required'),
  body('language').isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english']).withMessage('Invalid language'),
  body('dialect').optional().isIn(['standard', 'colloquial']),
  body('location').optional().isObject(),
  body('deliveryAddress').optional().isObject(),
  body('paymentMethod').optional().isIn(['cod', 'online', 'wallet']),
  body('deviceId').optional().isString()
];

// Create voice-based order
router.post('/voice',
  authMiddleware,
  verifyDevice,
  validateVoiceOrder,
  asyncHandler(async (req, res, next) => {
    try {
      const {
        voiceCommand,
        language,
        dialect,
        location,
        deliveryAddress,
        paymentMethod,
        deviceId
      } = req.body;

      const userId = req.user._id;

      // Process voice command using ChatGPT
      const processedCommand = await chatGPTService.processVoiceCommand(voiceCommand, {
        language,
        dialect,
        location,
        deliveryAddress,
        paymentMethod,
        deviceId,
      });

      // Generate voice response
      const voiceResponse = await chatGPTService.generateVoiceResponse(processedCommand, {
        language,
        dialect,
      });

      // Handle offline mode
      if (deviceId) {
        const offlineOrder = new Order({
          user: userId,
          items: [], // Will be populated when synced
          status: 'pending',
          voiceOrder: {
            originalCommand: voiceCommand,
            processedCommand,
            confirmed: false,
          },
          offlineMode: {
            isOffline: true,
            deviceId,
            syncStatus: 'pending',
          },
        });

        await offlineOrder.save();

        return res.status(200).json({
          success: true,
          message: 'Offline order created successfully',
          data: {
            order: offlineOrder,
            voiceResponse,
            processedCommand,
          },
        });
      }

      // Handle online mode
      if (processedCommand.type === 'order' && processedCommand.confidence >= 0.7) {
        // Extract order items from the processed command
        const orderItems = await extractOrderItemsFromCommand(processedCommand);
        
        const order = new Order({
          user: userId,
          items: orderItems,
          status: 'pending',
          voiceOrder: {
            originalCommand: voiceCommand,
            processedCommand,
            confirmed: false,
          },
          delivery: {
            address: deliveryAddress || processedCommand.extracted.delivery?.address,
            location: location,
          },
          payment: {
            method: paymentMethod || processedCommand.extracted.payment?.method || 'cash_on_delivery',
          },
        });

        await order.save();

        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: {
            order,
            voiceResponse,
            processedCommand,
          },
        });
      }

      // If command is not clear enough
      return res.status(200).json({
        success: true,
        message: 'Command processed, awaiting confirmation',
        data: {
          voiceResponse,
          processedCommand,
        },
      });

    } catch (error) {
      logger.error('Error creating voice order:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing voice order',
        error: error.message,
      });
    }
  })
);

// Confirm voice order
router.post('/:id/confirm',
  authMiddleware,
  [
    body('confirmationCommand').isString().notEmpty().withMessage('Confirmation command is required'),
    body('language').isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english']).withMessage('Invalid language'),
    body('dialect').optional().isIn(['standard', 'colloquial'])
  ],
  asyncHandler(async (req, res, next) => {
    try {
      const { confirmationCommand, language, dialect } = req.body;
      const order = await Order.findOne({
        _id: req.params.id,
        user: req.user._id,
        status: 'pending'
      });

      if (!order) {
        throw new ApiError(404, 'Order not found or cannot be confirmed');
      }

      // Process confirmation command
      const isConfirmed = await voiceService.processConfirmationCommand(
        confirmationCommand,
        order.voiceOrder.originalCommand,
        language,
        dialect
      );

      if (!isConfirmed) {
        throw new ApiError(400, 'Order confirmation failed');
      }

      // Confirm order
      await order.confirmVoiceOrder(confirmationCommand, language, dialect);

      // Generate confirmation response
      const confirmationResponse = `Order confirmed successfully. Your order number is ${order._id}. Thank you for shopping with us!`;
      const voiceResponse = await voiceService.generateVoiceResponse(
        confirmationResponse,
        language,
        dialect
      );

      res.json({
        success: true,
        data: {
          order,
          confirmationResponse,
          voiceResponse
        }
      });
    } catch (error) {
      next(error);
    }
  })
);

// Get user's orders
router.get('/',
  authMiddleware,
  [
    query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('merchant', 'name phone')
      .populate('items.product', 'name price unit')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

// Get order details
router.get('/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('merchant', 'name phone')
    .populate('items.product', 'name price unit images');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  })
);

// Cancel order
router.post('/:id/cancel',
  authMiddleware,
  [
    body('reason').optional().isString(),
    body('voiceCommand').optional().isString()
  ],
  asyncHandler(async (req, res) => {
    const { reason, voiceCommand } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (!order) {
      throw new ApiError(404, 'Order not found or cannot be cancelled');
    }

    await order.addToTimeline(
      'cancelled',
      reason || 'Cancelled by user',
      req.user.id
    );

    if (voiceCommand) {
      order.voiceOrder.cancellationCommand = voiceCommand;
      await order.save();
    }

    res.status(200).json({
      status: 'success',
      data: {
        order,
        message: 'Order cancelled successfully'
      }
    });
  })
);

// Sync offline orders
router.post('/sync',
  authMiddleware,
  verifyDevice,
  [
    body('orders').isArray().withMessage('Orders array is required'),
    body('orders.*.voiceCommand').isString().notEmpty(),
    body('orders.*.language').isIn(['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english']),
    body('orders.*.dialect').optional().isIn(['standard', 'colloquial'])
  ],
  asyncHandler(async (req, res) => {
    const { orders, deviceId } = req.body;
    const syncedOrders = [];

    for (const offlineOrder of orders) {
      // Process each offline order
      const processedCommand = await processVoiceCommand(
        offlineOrder.voiceCommand,
        offlineOrder.language,
        offlineOrder.dialect
      );

      const orderItems = await extractOrderItems(
        processedCommand,
        offlineOrder.language,
        offlineOrder.dialect
      );

      if (orderItems.length) {
        const totalAmount = orderItems.reduce(
          (total, item) => total + (item.price * item.quantity),
          0
        );

        const order = await Order.create({
          user: req.user.id,
          merchant: orderItems[0].product.merchant,
          items: orderItems.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            voiceCommand: {
              original: offlineOrder.voiceCommand,
              language: offlineOrder.language,
              dialect: offlineOrder.dialect
            }
          })),
          totalAmount,
          voiceOrder: {
            originalCommand: offlineOrder.voiceCommand,
            language: offlineOrder.language,
            dialect: offlineOrder.dialect,
            processedCommand
          },
          delivery: {
            address: req.user.address,
            location: req.user.location
          },
          offlineMode: {
            isOffline: true,
            synced: true,
            syncTime: new Date(),
            deviceId
          }
        });

        syncedOrders.push(order);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        orders: syncedOrders,
        message: `${syncedOrders.length} orders synced successfully`
      }
    });
  })
);

// Helper function to process voice commands (placeholder)
async function processVoiceCommand(command, language, dialect) {
  // In production, this would use BharatGPT API
  // For now, return the command as is
  return command;
}

// Helper function to extract order items from processed command (placeholder)
async function extractOrderItems(processedCommand, language, dialect) {
  // In production, this would use BharatGPT API to extract items
  // For now, return empty array
  return [];
}

// Helper function to generate confirmation prompt
function generateConfirmationPrompt(order, language, dialect) {
  const items = order.items.map(item => 
    `${item.quantity} ${item.unit} of ${item.product.name} at ₹${item.price} per ${item.unit}`
  ).join(', ');

  const total = `Total amount: ₹${order.totalAmount}`;
  const prompt = `Please confirm your order: ${items}. ${total}. Say yes to confirm or no to cancel.`;

  // In production, this would be translated based on language and dialect
  return prompt;
}

// Helper function to extract order items from processed command
async function extractOrderItemsFromCommand(processedCommand) {
  const { extracted } = processedCommand;
  const items = [];

  if (extracted.product && extracted.quantity) {
    // Find matching products in the database
    const products = await Product.find({
      name: { $regex: extracted.product.name, $options: 'i' },
      category: extracted.product.category ? { $regex: extracted.product.category, $options: 'i' } : undefined,
      price: extracted.product.maxPrice ? { $lte: extracted.product.maxPrice } : undefined,
      isActive: true,
    }).limit(5);

    if (products.length > 0) {
      const product = products[0]; // Use the first matching product
      items.push({
        product: product._id,
        quantity: extracted.quantity.value || 1,
        unit: extracted.quantity.unit || product.unit,
        price: product.price,
      });
    }
  }

  return items;
}

module.exports = router; 