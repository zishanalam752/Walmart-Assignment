const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0']
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'pack']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    // Voice command that led to this item
    voiceCommand: {
      original: {
        type: String,
        required: true
      },
      language: {
        type: String,
        enum: ['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english'],
        required: true
      },
      dialect: {
        type: String,
        enum: ['standard', 'colloquial'],
        default: 'standard'
      }
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Voice-based order details
  voiceOrder: {
    originalCommand: {
      type: String,
      required: true
    },
    language: {
      type: String,
      enum: ['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english'],
      required: true
    },
    dialect: {
      type: String,
      enum: ['standard', 'colloquial'],
      default: 'standard'
    },
    // Processed command details
    processedCommand: {
      type: String,
      required: true
    },
    // Voice confirmation details
    confirmation: {
      required: {
        type: Boolean,
        default: false
      },
      confirmed: {
        type: Boolean,
        default: false
      },
      confirmationCommand: String,
      confirmationTime: Date
    }
  },
  // Delivery details
  delivery: {
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function(v) {
            return v.length === 2 && 
                   v[0] >= -180 && v[0] <= 180 && 
                   v[1] >= -90 && v[1] <= 90;
          },
          message: 'Invalid coordinates'
        }
      }
    },
    instructions: String,
    preferredDeliveryTime: {
      type: Date
    },
    actualDeliveryTime: {
      type: Date
    }
  },
  // Payment details
  payment: {
    method: {
      type: String,
      enum: ['cod', 'online', 'wallet'],
      default: 'cod'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentTime: Date
  },
  // Offline mode details
  offlineMode: {
    isOffline: {
      type: Boolean,
      default: false
    },
    synced: {
      type: Boolean,
      default: true
    },
    syncTime: Date,
    deviceId: String
  },
  // Order timeline
  timeline: [{
    status: {
      type: String,
      enum: ['created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Customer feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    voiceFeedback: {
      original: String,
      language: String,
      dialect: String,
      processed: String
    },
    submittedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ merchant: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'delivery.location': '2dsphere' });
orderSchema.index({ 'delivery.address.pincode': 1 });
orderSchema.index({ 'offlineMode.deviceId': 1 });

// Virtual for order's full delivery address
orderSchema.virtual('fullDeliveryAddress').get(function() {
  const { street, city, state, pincode, landmark } = this.delivery.address;
  return `${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}`;
});

// Method to add status to timeline
orderSchema.methods.addToTimeline = async function(status, note, updatedBy) {
  this.timeline.push({
    status,
    note,
    updatedBy
  });
  this.status = status;
  return this.save();
};

// Method to confirm voice order
orderSchema.methods.confirmVoiceOrder = async function(confirmationCommand) {
  this.voiceOrder.confirmation.confirmed = true;
  this.voiceOrder.confirmation.confirmationCommand = confirmationCommand;
  this.voiceOrder.confirmation.confirmationTime = new Date();
  this.status = 'confirmed';
  return this.addToTimeline('confirmed', 'Order confirmed via voice command');
};

// Method to process offline order
orderSchema.methods.processOfflineOrder = async function(deviceId) {
  this.offlineMode.isOffline = true;
  this.offlineMode.synced = false;
  this.offlineMode.deviceId = deviceId;
  return this.save();
};

// Method to sync offline order
orderSchema.methods.syncOfflineOrder = async function() {
  this.offlineMode.synced = true;
  this.offlineMode.syncTime = new Date();
  return this.save();
};

// Pre-save middleware to update timeline
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 