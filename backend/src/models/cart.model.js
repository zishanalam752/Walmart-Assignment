const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true,
    enum: ['piece', 'kg', 'g', 'l', 'ml'],
    default: 'piece'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  voiceOrder: {
    type: Boolean,
    default: false
  },
  voiceCommand: {
    originalCommand: String,
    processedAt: Date
  }
}, {
  timestamps: true
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total cart value
cartSchema.virtual('total').get(function() {
  return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
});

// Virtual for total items count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function(productId, quantity, unit, voiceOrder = false) {
  const existingItem = this.items.find(
    item => item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      unit,
      voiceOrder
    });
  }

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }

  if (quantity <= 0) {
    this.items.pull(itemId);
  } else {
    item.quantity = quantity;
  }

  return this.save();
};

// Method to remove item
cartSchema.methods.removeItem = async function(itemId) {
  this.items.pull(itemId);
  return this.save();
};

// Method to clear cart
cartSchema.methods.clear = async function() {
  this.items = [];
  return this.save();
};

// Pre-save middleware to populate product details
cartSchema.pre('save', async function(next) {
  if (this.isModified('items')) {
    for (const item of this.items) {
      if (item.isModified('product')) {
        const product = await mongoose.model('Product').findById(item.product);
        if (product) {
          item.price = product.price;
          if (!item.unit) {
            item.unit = product.unit;
          }
        }
      }
    }
  }
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart; 