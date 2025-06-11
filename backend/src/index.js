require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const notificationService = require('./services/notification.service');
const notificationRoutes = require('./routes/notification.routes');

// Import routes
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const voiceRoutes = require('./routes/voice.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Create Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('Connected to MongoDB'))
.catch((err) => logger.error('MongoDB connection error:', err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected');
  
  socket.on('voice_command', async (data) => {
    try {
      // Handle voice commands
      logger.info('Received voice command:', data);
      // Process voice command and emit response
      socket.emit('command_response', { status: 'processing' });
    } catch (error) {
      logger.error('Error processing voice command:', error);
      socket.emit('command_error', { message: 'Error processing command' });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/voice', authMiddleware, voiceRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use(errorHandler);

// Attach WebSocket server for notifications
notificationService.attachToServer(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

module.exports = { app, httpServer }; 