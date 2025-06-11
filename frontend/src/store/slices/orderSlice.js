import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const { language, dialect } = getState().auth;
      const params = new URLSearchParams({
        ...filters,
        language,
        dialect
      });

      const response = await axios.get(
        `${API_URL}/orders?${params}`,
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

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const { language, dialect } = getState().auth;
      const params = new URLSearchParams({ language, dialect });

      const response = await axios.get(
        `${API_URL}/orders/${orderId}?${params}`,
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

export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async ({ orderId, reason, voiceCommand }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const { language, dialect } = getState().auth;

      const response = await axios.post(
        `${API_URL}/orders/${orderId}/cancel`,
        {
          reason,
          voiceCommand,
          language,
          dialect
        },
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

export const syncOfflineOrders = createAsyncThunk(
  'orders/syncOfflineOrders',
  async (orders, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_URL}/orders/sync`,
        { orders },
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
  selectedOrder: null,
  loading: false,
  error: null,
  filters: {
    status: null,
    startDate: null,
    endDate: null,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  offlineOrders: [],
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    addOfflineOrder: (state, action) => {
      state.offlineOrders.push(action.payload);
    },
    clearOfflineOrders: (state) => {
      state.offlineOrders = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.orders;
        state.pagination = {
          ...state.pagination,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch orders';
      })
      // Fetch Order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload.order;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch order';
      })
      // Cancel Order
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          order => order._id === action.payload.order._id
        );
        if (index !== -1) {
          state.items[index] = action.payload.order;
        }
        if (state.selectedOrder?._id === action.payload.order._id) {
          state.selectedOrder = action.payload.order;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to cancel order';
      })
      // Sync Offline Orders
      .addCase(syncOfflineOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncOfflineOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.offlineOrders = [];
        // Add synced orders to the items list
        state.items = [...action.payload.orders, ...state.items];
      })
      .addCase(syncOfflineOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to sync offline orders';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setPage,
  addOfflineOrder,
  clearOfflineOrders,
  clearError,
} = orderSlice.actions;

// Selectors
export const selectOrders = (state) => state.orders.items;
export const selectSelectedOrder = (state) => state.orders.selectedOrder;
export const selectOrderFilters = (state) => state.orders.filters;
export const selectOrderPagination = (state) => state.orders.pagination;
export const selectOfflineOrders = (state) => state.orders.offlineOrders;
export const selectIsLoading = (state) => state.orders.loading;
export const selectError = (state) => state.orders.error;

export default orderSlice.reducer; 