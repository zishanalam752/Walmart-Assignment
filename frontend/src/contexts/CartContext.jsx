import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();
  const { showNotification } = useNotification();

  // Load cart from backend when user logs in
  useEffect(() => {
    if (user && token) {
      fetchCart();
    } else {
      setCart([]); // Clear cart when user logs out
    }
  }, [user, token]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch cart');

      const data = await response.json();
      setCart(data.data.cart.items);
    } catch (error) {
      showNotification(error.message || 'Error fetching cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, unit = 'piece') => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          quantity,
          unit,
          voiceOrder: false // Set to true when adding via voice command
        })
      });

      if (!response.ok) throw new Error('Failed to add item to cart');

      const data = await response.json();
      setCart(data.data.cart.items);
      showNotification('Item added to cart', 'success');
    } catch (error) {
      showNotification(error.message || 'Error adding item to cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart/update/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });

      if (!response.ok) throw new Error('Failed to update cart');

      const data = await response.json();
      setCart(data.data.cart.items);
      showNotification('Cart updated', 'success');
    } catch (error) {
      showNotification(error.message || 'Error updating cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to remove item from cart');

      const data = await response.json();
      setCart(data.data.cart.items);
      showNotification('Item removed from cart', 'success');
    } catch (error) {
      showNotification(error.message || 'Error removing item from cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to clear cart');

      setCart([]);
      showNotification('Cart cleared', 'success');
    } catch (error) {
      showNotification(error.message || 'Error clearing cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processVoiceCommand = async (command) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cart/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          voiceCommand: command,
          language: 'english', // TODO: Get from user preferences
          context: 'cart'
        })
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      const { action, productId, itemId, quantity } = data.data.processedCommand.extracted;

      switch (action) {
        case 'add':
          if (productId) {
            await addToCart(productId, quantity || 1);
          }
          break;
        case 'update':
          if (itemId && quantity) {
            await updateQuantity(itemId, quantity);
          }
          break;
        case 'remove':
          if (itemId) {
            await removeFromCart(itemId);
          }
          break;
        case 'clear':
          await clearCart();
          break;
        default:
          showNotification('Could not understand the command', 'error');
      }
    } catch (error) {
      showNotification(error.message || 'Error processing voice command', 'error');
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    processVoiceCommand,
    getCartTotal,
    getCartItemCount,
    refreshCart: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext; 