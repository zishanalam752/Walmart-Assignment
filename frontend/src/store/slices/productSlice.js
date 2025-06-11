import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
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
        `${API_URL}/products?${params}`,
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

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const { language, dialect } = getState().auth;
      const params = new URLSearchParams({ language, dialect });

      const response = await axios.get(
        `${API_URL}/products/${productId}?${params}`,
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

export const searchProductsByVoice = createAsyncThunk(
  'products/searchByVoice',
  async (voiceQuery, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const { language, dialect } = getState().auth;

      const response = await axios.post(
        `${API_URL}/products/voice-search`,
        {
          voiceQuery,
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

const initialState = {
  items: [],
  selectedProduct: null,
  loading: false,
  error: null,
  filters: {
    category: null,
    minPrice: null,
    maxPrice: null,
    location: null,
    searchQuery: '',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  voiceSearch: {
    isListening: false,
    query: null,
    results: [],
  },
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
      state.pagination.page = 1; // Reset to first page on filter change
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    setVoiceSearchQuery: (state, action) => {
      state.voiceSearch.query = action.payload;
    },
    startVoiceSearch: (state) => {
      state.voiceSearch.isListening = true;
    },
    stopVoiceSearch: (state) => {
      state.voiceSearch.isListening = false;
    },
    clearVoiceSearch: (state) => {
      state.voiceSearch = initialState.voiceSearch;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination = {
          ...state.pagination,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch products';
      })
      // Fetch Product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload.product;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch product';
      })
      // Voice Search
      .addCase(searchProductsByVoice.pending, (state) => {
        state.voiceSearch.isListening = false;
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProductsByVoice.fulfilled, (state, action) => {
        state.loading = false;
        state.voiceSearch.results = action.payload.products;
        state.items = action.payload.products;
        state.pagination = {
          ...state.pagination,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(searchProductsByVoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Voice search failed';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setPage,
  setVoiceSearchQuery,
  startVoiceSearch,
  stopVoiceSearch,
  clearVoiceSearch,
  clearError,
} = productSlice.actions;

// Selectors
export const selectProducts = (state) => state.products.items;
export const selectSelectedProduct = (state) => state.products.selectedProduct;
export const selectProductFilters = (state) => state.products.filters;
export const selectProductPagination = (state) => state.products.pagination;
export const selectVoiceSearch = (state) => state.products.voiceSearch;
export const selectIsLoading = (state) => state.products.loading;
export const selectError = (state) => state.products.error;

export default productSlice.reducer; 