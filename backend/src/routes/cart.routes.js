const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const { ChatGPTService } = require('../services/chatgpt.service');

const chatgptService = new ChatGPTService();

// Get cart
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price image unit');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching cart'
    });
  }
});

// Add item to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity, unit, voiceOrder } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        unit: unit || product.unit,
        price: product.price,
        voiceOrder: voiceOrder || false
      });
    }

    await cart.save();
    await cart.populate('items.product', 'name price image unit');

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error adding item to cart'
    });
  }
});

// Update cart item quantity
router.put('/update/:itemId', protect, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product', 'name price image unit');

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating cart'
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', protect, async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== itemId
    );

    await cart.save();
    await cart.populate('items.product', 'name price image unit');

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error removing item from cart'
    });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error clearing cart'
    });
  }
});

// Process voice commands for cart
router.post('/voice', protect, async (req, res) => {
  try {
    const { voiceCommand, language, context } = req.body;

    // Process voice command using ChatGPT service
    const processedCommand = await chatgptService.processVoiceCommand(
      voiceCommand,
      language,
      context
    );

    res.json({
      success: true,
      data: {
        processedCommand
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error processing voice command'
    });
  }
});

module.exports = router; 