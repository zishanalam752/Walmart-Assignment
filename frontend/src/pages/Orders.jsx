import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, delivered, cancelled
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const { showNotification } = useNotification();
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  useEffect(() => {
    if (transcript) {
      handleVoiceCommand(transcript);
    }
  }, [transcript]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/orders?status=${filter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.data.orders);
    } catch (error) {
      showNotification(error.message || 'Error fetching orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = async (command) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voiceCommand: command,
          language: 'english', // TODO: Get from user preferences
          context: 'orders'
        })
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      const { action, orderId, status } = data.data.processedCommand.extracted;

      switch (action) {
        case 'view':
          if (orderId) {
            navigate(`/orders/${orderId}`);
          }
          break;
        case 'filter':
          if (status) {
            setFilter(status);
          }
          break;
        case 'cancel':
          if (orderId) {
            await handleCancelOrder(orderId);
          }
          break;
        default:
          showNotification('Could not understand the command', 'error');
      }
    } catch (error) {
      showNotification(error.message || 'Error processing voice command', 'error');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to cancel order');

      showNotification('Order cancelled successfully', 'success');
      fetchOrders(); // Refresh orders list
    } catch (error) {
      showNotification(error.message || 'Error cancelling order', 'error');
    }
  };

  const toggleVoiceCommands = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      showNotification('Listening for voice commands...', 'info');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <button
          onClick={toggleVoiceCommands}
          className={`px-4 py-2 rounded-lg text-white transition-colors ${
            isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isListening ? 'Stop Voice Commands' : 'Voice Commands'}
        </button>
      </div>

      {/* Voice Command Status */}
      {isListening && (
        <div className="mb-6 p-4 bg-indigo-100 rounded-lg">
          <p className="text-indigo-700">
            Listening... {transcript && `"${transcript}"`}
          </p>
          <p className="mt-2 text-sm text-indigo-600">
            Try saying: "Show pending orders", "View order 123", or "Cancel order 123"
          </p>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
          <p className="mt-2 text-gray-500">
            {filter === 'all'
              ? 'You haven\'t placed any orders yet'
              : `No ${filter} orders found`}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-800"
            >
              View all orders
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Order #{order._id}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900">Items</h4>
                  <ul className="mt-2 divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <li key={item._id} className="py-2 flex justify-between">
                        <div>
                          <p className="text-sm text-gray-900">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit}
                          </p>
                        </div>
                        <p className="text-sm text-gray-900">
                          ₹{item.price * item.quantity}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-lg font-medium text-gray-900">
                      ₹{order.totalAmount}
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => navigate(`/orders/${order._id}`)}
                      className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
                    >
                      View Details
                    </button>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="px-4 py-2 text-red-600 hover:text-red-800"
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>

                {order.voiceOrder && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      Voice Command: "{order.voiceOrder.originalCommand}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders; 