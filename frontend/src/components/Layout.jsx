import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import Search from './Search';

const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { notification, hideNotification } = useNotification();
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Modern color palette
  const colors = {
    primary: {
      light: '#4a90e2',
      main: '#2874f0',
      dark: '#1a5dc8',
      gradient: 'linear-gradient(135deg, #2874f0 0%, #1a5dc8 100%)'
    },
    accent: {
      yellow: '#ffc200',
      green: '#388e3c',
      red: '#ff6161',
      orange: '#ff9f00'
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717'
    }
  };

  const categories = [
    { name: 'Top Offers', color: colors.accent.red },
    { name: 'Grocery', color: colors.accent.orange },
    { name: 'Mobile', color: colors.primary.main },
    { name: 'Fashion', color: colors.accent.red },
    { name: 'Electronics', color: colors.accent.green },
    { name: 'Home', color: colors.accent.orange },
    { name: 'Appliances', color: colors.primary.main },
    { name: 'Travel', color: colors.accent.green },
    { name: 'Toys & Baby', color: colors.accent.red },
    { name: 'Beauty', color: colors.accent.orange }
  ];

  const navItems = [
    { 
      path: '/', 
      label: 'Home',
      icon: (
        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      path: '/products', 
      label: 'Products',
      icon: (
        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    { 
      path: '/cart', 
      label: 'Cart',
      icon: (
        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    ...(user?.role === 'admin' ? [{
      path: '/admin',
      label: 'Admin',
      icon: (
        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-primary-main to-primary-dark sticky top-0 z-50 shadow-lg">
        <div className="absolute inset-0 bg-black/5 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center h-16 px-6">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group mr-10">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-xl font-bold text-white tracking-tight"
              >
                <span className="text-accent-yellow">Flip</span>kart
              </motion.div>
              <motion.div 
                className="text-white/90 text-sm italic"
                whileHover={{ opacity: 1 }}
              >
                <span className="text-accent-yellow font-medium">Explore</span> Plus
              </motion.div>
            </Link>

            {/* Search Bar */}
            <div className="flex-grow max-w-xl">
              <Search />
            </div>

            {/* Login Button */}
            {!user && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="ml-10"
              >
                <Link
                  to="/login"
                  className="px-8 py-2 bg-white text-primary-main text-sm font-semibold rounded-sm hover:bg-neutral-50 transition-all shadow-md hover:shadow-lg"
                >
                  Login
                </Link>
              </motion.div>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative group ml-10">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 text-white text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-medium backdrop-blur-md ring-1 ring-white/20">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </motion.button>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-xl py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-neutral-200"
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary-main transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary-main transition-colors"
                  >
                    Sign out
                  </button>
                </motion.div>
              </div>
            )}

            {/* Cart */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="ml-10"
            >
              <Link to="/cart" className="flex items-center text-white text-sm font-medium">
                <span>Cart</span>
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-2 bg-accent-yellow text-primary-main text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-md"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          </div>

          {/* Categories Bar */}
          <div className="relative bg-white/95 backdrop-blur-sm shadow-sm">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center h-10 space-x-10 overflow-x-auto scrollbar-hide">
                {categories.map((category) => (
                  <motion.button
                    key={category.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === category.name 
                        ? 'text-primary-main border-b-2 border-primary-main' 
                        : 'text-neutral-700 hover:text-primary-main'
                    }`}
                    onMouseEnter={() => {
                      setActiveCategory(category.name);
                      setShowMegaMenu(true);
                    }}
                    onMouseLeave={() => {
                      setActiveCategory(null);
                      setShowMegaMenu(false);
                    }}
                  >
                    {category.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 py-16 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-16">
            {[
              {
                title: 'ABOUT',
                items: ['Contact Us', 'About Us', 'Careers', 'Flipkart Stories']
              },
              {
                title: 'HELP',
                items: ['Payments', 'Shipping', 'Cancellation & Returns', 'FAQ']
              },
              {
                title: 'POLICY',
                items: ['Return Policy', 'Terms Of Use', 'Security', 'Privacy']
              },
              {
                title: 'SOCIAL',
                items: ['Facebook', 'Twitter', 'YouTube', 'Instagram']
              }
            ].map((section) => (
              <div key={section.title}>
                <h3 className="text-neutral-900 text-sm font-semibold mb-5 tracking-wide uppercase">
                  {section.title}
                </h3>
                <ul className="space-y-4">
                  {section.items.map((item) => (
                    <motion.li 
                      key={item}
                      whileHover={{ x: 4 }}
                      className="text-sm text-neutral-600 hover:text-primary-main cursor-pointer transition-colors"
                    >
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 pt-8 border-t border-neutral-200 text-center">
            <p className="text-sm text-neutral-500">&copy; {new Date().getFullYear()} Flipkart Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-white px-5 py-3 rounded-sm shadow-xl border border-neutral-200 max-w-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-700 font-medium">{notification.message}</p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={hideNotification}
                className="ml-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ×
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root {
          --color-primary-light: ${colors.primary.light};
          --color-primary-main: ${colors.primary.main};
          --color-primary-dark: ${colors.primary.dark};
          --color-accent-yellow: ${colors.accent.yellow};
          --color-accent-green: ${colors.accent.green};
          --color-accent-red: ${colors.accent.red};
          --color-accent-orange: ${colors.accent.orange};
        }
      `}</style>
    </div>
  );
};

export default Layout; 