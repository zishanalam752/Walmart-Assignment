import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Async thunks
export const createVoiceOrder = createAsyncThunk(
  'cart/createVoiceOrder',
  async (orderData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_URL}/orders/voice`,
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const confirmVoiceOrder = createAsyncThunk(
  'cart/confirmVoiceOrder',
  async ({ orderId, confirmationData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_URL}/orders/${orderId}/confirm`,
        confirmationData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  items: [],
  pendingOrder: null,
  loading: false,
  error: null,
  voiceCommand: null,
  isListening: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { product, quantity, unit } = action.payload;
      const existingItem = state.items.find(
        item => item.product._id === product._id
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          product,
          quantity,
          unit,
          price: product.price
        });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(
        item => item.product._id !== action.payload
      );
    },
    updateQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find(item => item.product._id === productId);
      if (item) {
        item.quantity = quantity;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.pendingOrder = null;
      state.error = null;
    },
    setVoiceCommand: (state, action) => {
      state.voiceCommand = action.payload;
    },
    startListening: (state) => {
      state.isListening = true;
    },
    stopListening: (state) => {
      state.isListening = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Voice Order
      .addCase(createVoiceOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVoiceOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingOrder = action.data.order;
        state.voiceCommand = null;
      })
      .addCase(createVoiceOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to create order';
      })
      // Confirm Voice Order
      .addCase(confirmVoiceOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmVoiceOrder.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.pendingOrder = null;
      })
      .addCase(confirmVoiceOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to confirm order';
      });
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setVoiceCommand,
  startListening,
  stopListening,
  clearError,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartTotal = (state) =>
  state.cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
export const selectCartItemCount = (state) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
export const selectPendingOrder = (state) => state.cart.pendingOrder;
export const selectIsListening = (state) => state.cart.isListening;

export default cartSlice.reducer; 