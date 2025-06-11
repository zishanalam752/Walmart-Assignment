import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(
        `${API_URL}/notifications`,
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

export const markNotificationsAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationIds, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_URL}/notifications/mark-read`,
        { notificationIds },
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

export const clearOldNotifications = createAsyncThunk(
  'notifications/clearOld',
  async (days, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.delete(
        `${API_URL}/notifications/clear-old`,
        {
          data: { days },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const updateNotificationPreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.patch(
        `${API_URL}/notifications/preferences`,
        { preferences },
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
  preferences: {
    orderUpdates: true,
    voiceInteractions: true,
    systemUpdates: true,
    offlineSync: true,
  },
  loading: false,
  error: null,
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.unreadCount = action.payload.data.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch notifications';
      })
      // Mark as Read
      .addCase(markNotificationsAsRead.fulfilled, (state, action) => {
        const { notificationIds } = action.meta.arg;
        state.items = state.items.map(notification =>
          notificationIds.includes(notification._id)
            ? { ...notification, read: true }
            : notification
        );
        state.unreadCount = state.items.filter(n => !n.read).length;
      })
      // Clear Old Notifications
      .addCase(clearOldNotifications.fulfilled, (state) => {
        state.items = state.items.filter(n => !n.isOld);
        state.unreadCount = state.items.filter(n => !n.read).length;
      })
      // Update Preferences
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload.data;
      });
  },
});

export const {
  addNotification,
  clearNotifications,
  clearError,
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationPreferences = (state) => state.notifications.preferences;
export const selectIsLoading = (state) => state.notifications.loading;
export const selectError = (state) => state.notifications.error;

export default notificationSlice.reducer; 