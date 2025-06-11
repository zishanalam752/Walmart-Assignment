const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['ORDER_STATUS', 'VOICE_INTERACTION', 'SYSTEM_UPDATE', 'OFFLINE_SYNC']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const notificationPreferencesSchema = new mongoose.Schema({
  orderUpdates: {
    type: Boolean,
    default: true
  },
  voiceInteractions: {
    type: Boolean,
    default: true
  },
  systemUpdates: {
    type: Boolean,
    default: true
  },
  offlineSync: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'merchant', 'admin'],
    default: 'user'
  },
  preferredLanguage: {
    type: String,
    enum: ['hindi', 'tamil', 'kannada', 'bhojpuri', 'bengali', 'marathi', 'gujarati', 'english'],
    default: 'hindi'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registeredDevices: [{
    type: String,
    trim: true
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  offlineModeEnabled: {
    type: Boolean,
    default: true
  },
  voicePreferences: {
    enabled: {
      type: Boolean,
      default: true
    },
    dialect: {
      type: String,
      enum: ['standard', 'colloquial'],
      default: 'colloquial'
    },
    speed: {
      type: Number,
      min: 0.5,
      max: 2,
      default: 1
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  notifications: [notificationSchema],
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  return this.save();
};

// Add device
userSchema.methods.addDevice = async function(deviceId) {
  if (!this.registeredDevices.includes(deviceId)) {
    this.registeredDevices.push(deviceId);
    return this.save();
  }
  return this;
};

// Remove device
userSchema.methods.removeDevice = async function(deviceId) {
  this.registeredDevices = this.registeredDevices.filter(id => id !== deviceId);
  return this.save();
};

// Virtual for user's full address
userSchema.virtual('fullAddress').get(function() {
  const { street, city, state, pincode, landmark } = this.address;
  return `${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}`;
});

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'address.pincode': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User; 