import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Cart = () => {
  const [loading, setLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const { showNotification } = useNotification();
  const { token } = useAuth();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (transcript) {
      handleVoiceCommand(transcript);
    }
  }, [transcript]);

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
          cartContext: true
        })
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      const { type, action, itemId, quantity } = data.data.processedCommand.extracted;

      switch (action) {
        case 'update':
          if (itemId && quantity) {
            await handleUpdateQuantity(itemId, quantity);
          }
          break;
        case 'remove':
          if (itemId) {
            await handleRemoveItem(itemId);
          }
          break;
        case 'clear':
          await handleClearCart();
          break;
        case 'checkout':
          await handleCheckout();
          break;
        default:
          showNotification('Could not understand the command', 'error');
      }
    } catch (error) {
      showNotification(error.message || 'Error processing voice command', 'error');
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      await updateQuantity(itemId, newQuantity);
      showNotification('Cart updated successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Error updating cart', 'error');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeItem(itemId);
      showNotification('Item removed from cart', 'success');
    } catch (error) {
      showNotification(error.message || 'Error removing item', 'error');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      showNotification('Cart cleared', 'success');
    } catch (error) {
      showNotification(error.message || 'Error clearing cart', 'error');
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    try {
      setIsCheckingOut(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            unit: item.unit
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to create order');

      const data = await response.json();
      await clearCart();
      showNotification('Order placed successfully', 'success');
      navigate(`/orders/${data.data.order._id}`);
    } catch (error) {
      showNotification(error.message || 'Error placing order', 'error');
    } finally {
      setIsCheckingOut(false);
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

  const calculateTotal = () => {
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Add some items to your cart to continue shopping</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
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
            Try saying: "Update quantity to 2", "Remove item", "Clear cart", or "Checkout"
          </p>
        </div>
      )}

      {/* Cart Items */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="divide-y divide-gray-200">
          {cart.items.map((item) => (
            <div key={item._id} className="p-6 flex items-center">
              {item.product.image && (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="ml-6 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {item.product.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  ₹{item.price}/{item.unit}
                </p>
                <div className="mt-4 flex items-center space-x-4">
                  <div className="flex items-center">
                    <label htmlFor={`quantity-${item._id}`} className="sr-only">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id={`quantity-${item._id}`}
                      min="1"
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(item._id, parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-gray-500">{item.unit}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="ml-6 text-right">
                <p className="text-lg font-medium text-gray-900">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Total</h3>
            <p className="text-2xl font-bold text-gray-900">₹{calculateTotal()}</p>
          </div>
          <div className="flex justify-between space-x-4">
            <button
              onClick={handleClearCart}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear Cart
            </button>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart; 