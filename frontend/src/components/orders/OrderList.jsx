import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Grid,
  TextField,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  fetchOrders,
  setFilters,
  clearFilters,
  setPage,
  selectOrders,
  selectOrderFilters,
  selectOrderPagination,
  selectIsLoading,
  selectError,
} from '../../store/slices/orderSlice';

const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'info' },
  processing: { label: 'Processing', color: 'primary' },
  out_for_delivery: { label: 'Out for Delivery', color: 'secondary' },
  delivered: { label: 'Delivered', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

const OrderList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const orders = useSelector(selectOrders);
  const filters = useSelector(selectOrderFilters);
  const pagination = useSelector(selectOrderPagination);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    dispatch(fetchOrders({
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    }));
  }, [dispatch, filters, pagination.page]);

  const handleFilterChange = (field, value) => {
    dispatch(setFilters({ [field]: value }));
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    if (field === 'endDate' && value) {
      dispatch(setFilters({
        startDate: dateRange.startDate,
        endDate: value,
      }));
    }
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    setDateRange({ startDate: '', endDate: '' });
  };

  const handlePageChange = (event, value) => {
    dispatch(setPage(value));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label={t('Status')}
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">{t('All')}</MenuItem>
                {Object.entries(ORDER_STATUS).map(([value, { label }]) => (
                  <MenuItem key={value} value={value}>
                    {t(label)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                fullWidth
                label={t('Start Date')}
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                fullWidth
                label={t('End Date')}
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Stack spacing={2}>
        {orders.map((order) => (
          <Card key={order._id}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    {t('Order')} #{order._id.slice(-6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(order.createdAt)}
                  </Typography>
                  <Box mt={1}>
                    <Chip
                      label={t(ORDER_STATUS[order.status].label)}
                      color={ORDER_STATUS[order.status].color}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body1">
                    {t('Total')}: {formatCurrency(order.totalAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.items.length} {t('items')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <IconButton
                      onClick={() => navigate(`/orders/${order._id}`)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    {order.status === 'pending' && (
                      <IconButton
                        onClick={() => navigate(`/orders/${order._id}/cancel`)}
                        color="error"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* No Orders */}
      {orders.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('No orders found')}
        </Alert>
      )}
    </Box>
  );
};

export default OrderList; 