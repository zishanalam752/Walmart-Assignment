const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/error.middleware');
const User = require('../models/user.model');
const Order = require('../models/order.model');

class NotificationService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId to WebSocket connection
    this.initializeWebSocket();
  }

  // Initialize WebSocket server
  initializeWebSocket() {
    this.wss = new WebSocket.Server({ noServer: true });

    this.wss.on('connection', (ws, req) => {
      const userId = req.user._id;
      this.clients.set(userId.toString(), ws);

      ws.on('close', () => {
        this.clients.delete(userId.toString());
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.clients.delete(userId.toString());
      });
    });
  }

  // Attach WebSocket server to HTTP server
  attachToServer(server) {
    server.on('upgrade', (request, socket, head) => {
      // Verify authentication token
      const token = request.headers['sec-websocket-protocol'];
      if (!token) {
        socket.destroy();
        return;
      }

      // Verify token and get user
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        request.user = decoded;
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } catch (error) {
        socket.destroy();
      }
    });
  }

  // Send notification to a specific user
  async sendNotification(userId, notification) {
    try {
      const ws = this.clients.get(userId.toString());
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
      }

      // Store notification in user's notifications array
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            ...notification,
            read: false,
            createdAt: new Date()
          }
        }
      });
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
    }
  }

  // Send notification to multiple users
  async broadcastNotification(userIds, notification) {
    try {
      await Promise.all(userIds.map(userId => this.sendNotification(userId, notification)));
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  // Order-related notifications
  async notifyOrderStatus(orderId, status, userId) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name')
        .populate('merchant', 'name');

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      const notification = {
        type: 'ORDER_STATUS',
        title: 'Order Status Update',
        message: `Your order #${order._id} has been ${status}`,
        data: {
          orderId: order._id,
          status,
          merchantName: order.merchant.name
        },
        priority: 'high'
      };

      await this.sendNotification(userId, notification);
    } catch (error) {
      console.error(`Error sending order status notification:`, error);
    }
  }

  // Voice interaction notifications
  async notifyVoiceInteraction(userId, type, data) {
    try {
      const notification = {
        type: 'VOICE_INTERACTION',
        title: 'Voice Command Processed',
        message: this.getVoiceInteractionMessage(type, data),
        data: {
          interactionType: type,
          ...data
        },
        priority: 'medium'
      };

      await this.sendNotification(userId, notification);
    } catch (error) {
      console.error(`Error sending voice interaction notification:`, error);
    }
  }

  // System update notifications
  async notifySystemUpdate(userIds, update) {
    try {
      const notification = {
        type: 'SYSTEM_UPDATE',
        title: 'System Update',
        message: update.message,
        data: {
          updateType: update.type,
          details: update.details
        },
        priority: 'low'
      };

      await this.broadcastNotification(userIds, notification);
    } catch (error) {
      console.error('Error sending system update notification:', error);
    }
  }

  // Offline mode notifications
  async notifyOfflineSync(userId, syncResult) {
    try {
      const notification = {
        type: 'OFFLINE_SYNC',
        title: 'Offline Orders Synced',
        message: `Successfully synced ${syncResult.syncedCount} offline orders`,
        data: {
          syncedOrders: syncResult.syncedOrders,
          failedOrders: syncResult.failedOrders
        },
        priority: 'medium'
      };

      await this.sendNotification(userId, notification);
    } catch (error) {
      console.error(`Error sending offline sync notification:`, error);
    }
  }

  // Get voice interaction message based on type
  getVoiceInteractionMessage(type, data) {
    switch (type) {
      case 'ORDER_CREATED':
        return `Your voice order has been received. Please confirm your order of ${data.itemsCount} items.`;
      case 'ORDER_CONFIRMED':
        return `Your order has been confirmed. Order number: ${data.orderId}`;
      case 'ORDER_CANCELLED':
        return `Your order has been cancelled. Order number: ${data.orderId}`;
      case 'VOICE_ERROR':
        return `We couldn't process your voice command. Please try again.`;
      default:
        return 'Voice command processed successfully.';
    }
  }

  // Mark notifications as read
  async markNotificationsAsRead(userId, notificationIds) {
    try {
      await User.updateMany(
        {
          _id: userId,
          'notifications._id': { $in: notificationIds }
        },
        {
          $set: { 'notifications.$.read': true }
        }
      );
    } catch (error) {
      console.error(`Error marking notifications as read:`, error);
      throw new ApiError(500, 'Error updating notification status');
    }
  }

  // Get user's unread notifications
  async getUnreadNotifications(userId) {
    try {
      const user = await User.findById(userId)
        .select('notifications')
        .slice('notifications', -50); // Get last 50 notifications

      return user.notifications.filter(n => !n.read);
    } catch (error) {
      console.error(`Error getting unread notifications:`, error);
      throw new ApiError(500, 'Error fetching notifications');
    }
  }

  // Clear old notifications
  async clearOldNotifications(userId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      await User.updateOne(
        { _id: userId },
        {
          $pull: {
            notifications: {
              createdAt: { $lt: cutoffDate }
            }
          }
        }
      );
    } catch (error) {
      console.error(`Error clearing old notifications:`, error);
      throw new ApiError(500, 'Error clearing notifications');
    }
  }
}

module.exports = new NotificationService(); 