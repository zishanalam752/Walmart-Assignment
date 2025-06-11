import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { motion } from 'framer-motion';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showNotification } = useNotification();
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      await addToCart(product, 1);
      showNotification('Added to cart successfully', 'success');
    } catch (error) {
      showNotification(error.message || 'Error adding to cart', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Calculate discount percentage if original price exists
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 hover:shadow-lg transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image */}
      <div 
        className="relative cursor-pointer"
        onClick={() => navigate(`/products/${product._id}`)}
      >
        <div className="aspect-square overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain transform transition-transform duration-500 hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Discount Badge */}
        {discount && (
          <div className="absolute top-0 left-0 bg-[#ff6161] text-white text-xs px-2 py-1">
            {discount}% OFF
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-4">
        <h3 
          className="text-sm font-medium text-gray-800 mb-1 line-clamp-2 cursor-pointer hover:text-[#2874f0]"
          onClick={() => navigate(`/products/${product._id}`)}
        >
          {product.name}
        </h3>
        
        {/* Price Section */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-lg font-medium text-gray-900">
            ₹{product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <>
              <span className="text-sm text-gray-500 line-through">
                ₹{product.originalPrice.toLocaleString()}
              </span>
              <span className="text-sm text-[#ff6161]">
                {discount}% off
              </span>
            </>
          )}
        </div>

        {/* Bank Offer */}
        {product.bankOffer && (
          <div className="mt-2 text-xs text-[#388e3c]">
            Bank Offer
          </div>
        )}

        {/* Delivery Info */}
        <div className="mt-2 text-xs text-gray-500">
          {product.stock > 0 ? (
            <span className="text-[#388e3c]">Free Delivery</span>
          ) : (
            <span className="text-[#ff6161]">Out of Stock</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isAddingToCart || product.stock === 0}
          className={`mt-3 w-full py-2 text-sm font-medium rounded-sm transition-colors ${
            product.stock === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#ff9f00] text-white hover:bg-[#ff9100]'
          }`}
        >
          {isAddingToCart ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard; 