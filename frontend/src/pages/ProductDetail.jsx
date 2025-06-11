import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { motion } from 'framer-motion';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const { showNotification } = useNotification();
  const { token } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (transcript && isListening) {
      handleVoiceCommand(transcript);
    }
  }, [transcript, isListening]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data);
      setError(null);
    } catch (error) {
      setError(error.message);
      showNotification('Error loading product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = async (command) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          productId: id,
        }),
      });

      if (!response.ok) throw new Error('Failed to process voice command');

      const data = await response.json();
      
      if (data.action === 'add_to_cart') {
        await addToCart(product, data.quantity || 1);
        showNotification(`Added ${data.quantity || 1} ${product.unit} to cart`, 'success');
      } else if (data.action === 'set_quantity') {
        setQuantity(data.quantity);
        showNotification(`Quantity set to ${data.quantity}`, 'info');
      } else {
        showNotification('Voice command processed', 'success');
      }
    } catch (error) {
      showNotification(error.message || 'Error processing voice command', 'error');
    } finally {
      stopListening();
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(product, quantity);
      showNotification('Added to cart successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Error adding to cart', 'error');
    }
  };

  const handleVoiceOrder = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
    showNotification('Listening for voice order...', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/products')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {/* Product Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                  <span className="text-gray-400">No image available</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <p className="text-gray-600">{product.description}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-600">
                  ₹{product.price}
                </span>
                <span className="text-gray-500">/{product.unit}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  product.stock > 10
                    ? 'bg-green-100 text-green-800'
                    : product.stock > 0
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.stock > 10
                    ? 'In Stock'
                    : product.stock > 0
                    ? 'Low Stock'
                    : 'Out of Stock'}
                </span>
                {product.stock > 0 && (
                  <span className="text-sm text-gray-500">
                    {product.stock} {product.unit} available
                  </span>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <label htmlFor="quantity" className="text-gray-700 font-medium">
                  Quantity:
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center border-x border-gray-300 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Cart
                </button>

                <button
                  onClick={handleVoiceOrder}
                  className={`w-full px-6 py-3 rounded-lg text-white transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isListening ? 'Stop Voice Order' : 'Voice Order'}
                </button>
              </div>

              {/* Voice Order Status */}
              {isListening && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    {transcript ? `"${transcript}"` : 'Listening...'}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    Try saying: "Order 2 kg" or "Add to cart"
                  </p>
                </div>
              )}

              {/* Additional Info */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Product Details
                </h3>
                <dl className="grid grid-cols-1 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.category}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Unit</dt>
                    <dd className="mt-1 text-sm text-gray-900">{product.unit}</dd>
                  </div>
                  {product.sku && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SKU</dt>
                      <dd className="mt-1 text-sm text-gray-900">{product.sku}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetail; 