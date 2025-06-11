import React from 'react';
import { Outlet } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { Alert, Snackbar } from '@mui/material';

const Layout = () => {
  const { notification, hideNotification } = useNotification();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Voice Commerce</h1>
          <nav>
            {/* Add navigation items here */}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-4">
        <div className="container mx-auto text-center text-gray-600">
          © 2024 Voice Commerce. All rights reserved.
        </div>
      </footer>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Layout; 