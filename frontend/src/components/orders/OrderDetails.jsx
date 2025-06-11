import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Stack,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  AccessTime as AccessTimeIcon,
  Mic as MicIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  fetchOrderById,
  selectSelectedOrder,
  selectIsLoading,
  selectError,
} from '../../store/slices/orderSlice';

const ORDER_STATUS_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'out_for_delivery',
  'delivered',
];

const OrderDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orderId } = useParams();

  const order = useSelector(selectSelectedOrder);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
  }, [dispatch, orderId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getCurrentStep = () => {
    return ORDER_STATUS_STEPS.indexOf(order?.status) + 1;
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

  if (!order) {
    return (
      <Alert severity="info">
        {t('Order not found')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Order Status Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={getCurrentStep()} alternativeLabel>
            {ORDER_STATUS_STEPS.map((status) => (
              <Step key={status}>
                <StepLabel>{t(status.charAt(0).toUpperCase() + status.slice(1))}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Order Items */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('Order Items')}
              </Typography>
              <List>
                {order.items.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar src={item.product?.image} alt={item.product?.name}>
                          <ShoppingCartIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.product?.name}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {formatCurrency(item.price)} x {item.quantity} {item.unit}
                            </Typography>
                            {item.voiceCommand && (
                              <Box mt={1} display="flex" alignItems="center" gap={1}>
                                <MicIcon fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                  {t('Voice Command')}: {item.voiceCommand.originalCommand}
                                </Typography>
                              </Box>
                            )}
                          </>
                        }
                      />
                      <Typography variant="body1">
                        {formatCurrency(item.price * item.quantity)}
                      </Typography>
                    </ListItem>
                    {index < order.items.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{t('Total Amount')}</Typography>
                <Typography variant="h6">{formatCurrency(order.totalAmount)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Order Details */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Order Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('Order Information')}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <AccessTimeIcon color="action" />
                  <Typography variant="body2">
                    {t('Ordered on')}: {formatDate(order.createdAt)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={t(order.status.charAt(0).toUpperCase() + order.status.slice(1))}
                    color={
                      order.status === 'delivered' ? 'success' :
                      order.status === 'cancelled' ? 'error' :
                      'primary'
                    }
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Delivery Details */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('Delivery Details')}
                </Typography>
                <Box display="flex" alignItems="flex-start" gap={1} mb={2}>
                  <LocationIcon color="action" />
                  <Typography variant="body2">
                    {order.deliveryAddress}
                  </Typography>
                </Box>
                {order.preferredDeliveryTime && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTimeIcon color="action" />
                    <Typography variant="body2">
                      {t('Preferred Delivery')}: {formatDate(order.preferredDeliveryTime)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('Payment Details')}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PaymentIcon color="action" />
                  <Typography variant="body2">
                    {t('Method')}: {t(order.paymentDetails.method)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={t(order.paymentDetails.status)}
                    color={order.paymentDetails.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Voice Order Details */}
            {order.voiceOrderDetails && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('Voice Order Details')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <MicIcon color="action" />
                    <Typography variant="body2">
                      {t('Original Command')}: {order.voiceOrderDetails.originalCommand}
                    </Typography>
                  </Box>
                  {order.voiceOrderDetails.confirmationDetails && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <MicIcon color="action" />
                      <Typography variant="body2">
                        {t('Confirmation')}: {order.voiceOrderDetails.confirmationDetails.command}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {order.status === 'pending' && (
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={() => navigate(`/orders/${orderId}/cancel`)}
                >
                  {t('Cancel Order')}
                </Button>
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderDetails; 