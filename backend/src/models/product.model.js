const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  // Alternative names in different languages/dialects
  alternativeNames: [{
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
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Product description cannot exceed 1000 characters']
  },
  // Voice-friendly description in different languages
  voiceDescriptions: [{
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
    description: {
      type: String,
      required: true,
      trim: true
    }
  }],
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  unit: {
    type: String,
    required: true,
    enum: ['piece', 'kg', 'g', 'l', 'ml'],
    default: 'piece'
  },
  // Voice-friendly unit names in different languages
  unitNames: [{
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
    singular: {
      type: String,
      required: true,
      trim: true
    },
    plural: {
      type: String,
      required: true,
      trim: true
    }
  }],
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'groceries',
      'electronics',
      'clothing',
      'home',
      'beauty',
      'toys',
      'sports',
      'books',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  image: {
    url: {
      type: String,
      required: [true, 'Product image URL is required']
    },
    alt: {
      type: String,
      default: 'Product image'
    }
  },
  stock: {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 10
    }
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String
    }
  },
  // Voice command patterns for this product
  voicePatterns: [{
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
    patterns: [{
      type: String,
      required: true,
      trim: true
    }]
  }],
  // Product availability schedule
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      startTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
      },
      endTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
      }
    }]
  },
  // Product ratings and reviews
  ratings: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  voiceKeywords: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ name: 'text' });
productSchema.index({ 'alternativeNames.name': 'text' });
productSchema.index({ category: 1 });
productSchema.index({ merchant: 1 });
productSchema.index({ location: '2dsphere' });
productSchema.index({ 'location.address.pincode': 1 });

// Virtual for product's full address
productSchema.virtual('fullAddress').get(function() {
  const { street, city, state, pincode, landmark } = this.location.address;
  return `${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}`;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock.quantity === 0) return 'out_of_stock';
  if (this.stock.quantity <= this.stock.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price.toFixed(2)}`;
});

// Method to check if product is available at a given time
productSchema.methods.isAvailableAt = function(dateTime) {
  if (!this.availability.isAvailable) return false;
  
  const day = dateTime.toLocaleLowerCase().split(',')[0];
  const time = dateTime.toLocaleTimeString('en-US', { hour12: false });
  
  return this.availability.schedule.some(slot => 
    slot.day === day && 
    time >= slot.startTime && 
    time <= slot.endTime
  );
};

// Method to get voice-friendly name in a specific language
productSchema.methods.getVoiceName = function(language, dialect = 'standard') {
  const altName = this.alternativeNames.find(
    name => name.language === language && name.dialect === dialect
  );
  return altName ? altName.name : this.name;
};

// Method to get voice-friendly unit in a specific language
productSchema.methods.getVoiceUnit = function(language, dialect = 'standard', quantity = 1) {
  const unitName = this.unitNames.find(
    unit => unit.language === language && unit.dialect === dialect
  );
  if (!unitName) return this.unit;
  return quantity === 1 ? unitName.singular : unitName.plural;
};

// Method to update stock
productSchema.methods.updateStock = async function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.stock.quantity += quantity;
  } else if (operation === 'remove') {
    if (this.stock.quantity < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock.quantity -= quantity;
  }
  return this.save();
};

// Method to add review
productSchema.methods.addReview = async function(userId, rating, comment) {
  // Remove existing review by the same user
  this.reviews = this.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );

  // Add new review
  this.reviews.push({ user: userId, rating, comment });

  // Update average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.ratings.average = totalRating / this.reviews.length;
  this.ratings.count = this.reviews.length;

  return this.save();
};

// Method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  return this.stock.quantity >= quantity;
};

// Static method to search products
productSchema.statics.search = async function(query) {
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
      { voiceKeywords: { $regex: query, $options: 'i' } }
    ]
  };

  return this.find(searchQuery)
    .select('name price unit image stock.quantity category')
    .sort({ 'stock.quantity': -1, name: 1 });
};

// Static method to get products by category
productSchema.statics.getByCategory = async function(category) {
  return this.find({
    category,
    isActive: true
  })
    .select('name price unit image stock.quantity')
    .sort({ name: 1 });
};

// Static method to get low stock products
productSchema.statics.getLowStock = async function() {
  return this.find({
    'stock.quantity': { $lte: '$stock.lowStockThreshold' },
    isActive: true
  })
    .select('name price unit image stock.quantity stock.lowStockThreshold')
    .sort({ 'stock.quantity': 1 });
};

// Pre-save middleware to update voice keywords
productSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isModified('tags')) {
    // Generate voice keywords from name and tags
    const keywords = new Set([
      ...this.name.toLowerCase().split(' '),
      ...(this.tags || []).map(tag => tag.toLowerCase())
    ]);
    this.voiceKeywords = Array.from(keywords);
  }
  next();
});

// Index for search optimization
productSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  voiceKeywords: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 