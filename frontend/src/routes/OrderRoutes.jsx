import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import OrderList from '../components/orders/OrderList';
import OrderDetails from '../components/orders/OrderDetails';
import CancelOrder from '../components/orders/CancelOrder';
import VoiceOrder from '../components/orders/VoiceOrder';

const OrderRoutes = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<OrderList />} />
      <Route path="/voice" element={<VoiceOrder />} />
      <Route path="/:orderId" element={<OrderDetails />} />
      <Route path="/:orderId/cancel" element={<CancelOrder />} />
    </Routes>
  );
};

export default OrderRoutes; 