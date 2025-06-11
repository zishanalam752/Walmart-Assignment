import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { useNotification } from '../contexts/NotificationContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const { showNotification } = useNotification();

  React.useEffect(() => {
    if (transcript) {
      handleVoiceCommand(transcript);
    }
  }, [transcript]);

  const handleVoiceCommand = async (command) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('go home') || lowerCommand.includes('home page')) {
      navigate('/');
    } else if (lowerCommand.includes('go back') || lowerCommand.includes('previous page')) {
      navigate(-1);
    } else if (lowerCommand.includes('products') || lowerCommand.includes('shop')) {
      navigate('/products');
    } else if (lowerCommand.includes('cart')) {
      navigate('/cart');
    } else if (lowerCommand.includes('orders')) {
      navigate('/orders');
    } else if (lowerCommand.includes('profile')) {
      navigate('/profile');
    } else if (lowerCommand.includes('login')) {
      navigate('/login');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* 404 Illustration */}
            <div className="mb-8">
              <svg
                className="mx-auto h-12 w-12 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              404 - Page Not Found
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist.
            </p>

            {/* Voice Command Button */}
            <button
              onClick={toggleVoiceCommands}
              className={`mb-8 px-4 py-2 rounded-lg text-white transition-colors ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isListening ? 'Stop Voice Commands' : 'Voice Commands'}
            </button>

            {/* Voice Command Status */}
            {isListening && (
              <div className="mb-8 p-4 bg-indigo-100 rounded-lg">
                <p className="text-indigo-700">
                  Listening... {transcript && `"${transcript}"`}
                </p>
                <p className="mt-2 text-sm text-indigo-600">
                  Try saying: "Go home", "Go back", "Show products", or "Go to cart"
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go Home
              </button>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go Back
              </button>
            </div>

            {/* Quick Links */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-500 mb-4">
                Quick Links
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/products')}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Products
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Cart
                </button>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Orders
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 