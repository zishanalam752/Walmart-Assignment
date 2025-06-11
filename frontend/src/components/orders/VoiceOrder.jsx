import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ShoppingCart as ShoppingCartIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { selectCartItems, selectCartTotal } from '../../store/slices/cartSlice';
import { selectUser } from '../../store/slices/authSlice';
import { createOrder } from '../../store/slices/orderSlice';
import { VoiceFeedback } from '../common/VoiceFeedback';
import {
  processVoiceCommand,
  generateVoiceResponse,
} from '../../utils/voiceCommandProcessor';

const PAYMENT_METHODS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

const VoiceOrder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);
  const user = useSelector(selectUser);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState('');
  const [processedCommand, setProcessedCommand] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [preferredDeliveryTime, setPreferredDeliveryTime] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [orderContext, setOrderContext] = useState({});

  const recognition = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = user?.language || 'en-IN';

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setVoiceCommand(transcript);

        if (event.results[0].isFinal) {
          processVoiceCommand(transcript);
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setError(t('Voice recognition error. Please try again.'));
      };

      recognition.current.onend = () => {
        if (isRecording) {
          recognition.current.start();
        }
      };
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaRecorder.current = new MediaRecorder(stream);
          mediaRecorder.current.ondataavailable = (event) => {
            audioChunks.current.push(event.data);
          };
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          setError(t('Could not access microphone. Please check permissions.'));
        });
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = user?.preferences?.language || 'en-IN';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event) => {
        const command = event.results[0][0].transcript;
        handleVoiceCommand(command);
      };
    } else {
      setError('Speech recognition is not supported in your browser.');
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    } else {
      setError('Speech synthesis is not supported in your browser.');
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (mediaRecorder.current) {
        mediaRecorder.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [user?.language, t, user?.preferences?.language]);

  const processVoiceCommand = async (command) => {
    setIsProcessing(true);
    setCurrentCommand(command);
    
    try {
      // Process the voice command
      const processedCommand = processVoiceCommand(command, orderContext);
      
      // Add to command history
      setCommandHistory((prev) => [
        ...prev,
        {
          command,
          processed: processedCommand,
          timestamp: new Date(),
        },
      ]);

      // Generate and speak response
      const response = generateVoiceResponse(processedCommand, orderContext);
      setFeedbackText(response);
      speakResponse(response);

      // Handle different command types
      switch (processedCommand.type) {
        case 'order':
          if (processedCommand.confidence >= 0.7) {
            // Update order context
            setOrderContext((prev) => ({
              ...prev,
              ...processedCommand.extracted,
              previousCommand: command,
            }));
          }
          break;

        case 'confirmation':
          if (processedCommand.confirmationType === 'yes' && orderContext.product) {
            // Create order
            await handleOrderCreation();
          } else if (processedCommand.confirmationType === 'no') {
            // Clear order context
            setOrderContext({});
          }
          break;

        case 'general':
          if (processedCommand.generalType === 'cancel') {
            setOrderContext({});
          }
          break;

        default:
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrderCreation = async () => {
    try {
      const orderData = {
        items: cartItems.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          voiceCommand: {
            original: currentCommand,
            language: user?.preferences?.language || 'en-IN',
            dialect: user?.preferences?.dialect || 'standard',
          },
        })),
        totalAmount: cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
        deliveryAddress: orderContext.delivery?.address,
        deliveryTime: orderContext.delivery?.time,
        paymentMethod: orderContext.payment?.method || 'cash_on_delivery',
        voiceOrder: {
          originalCommand: currentCommand,
          processedCommand: orderContext,
          confirmed: true,
        },
      };

      await dispatch(createOrder(orderData)).unwrap();
      setOrderContext({});
      setCommandHistory([]);
      setFeedbackText('Order placed successfully! Is there anything else you need?');
      speakResponse('Order placed successfully! Is there anything else you need?');
    } catch (err) {
      setError('Failed to create order. Please try again.');
    }
  };

  const speakResponse = (text) => {
    if (synthesisRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = user?.preferences?.language || 'en-IN';
      synthesisRef.current.speak(utterance);
    }
  };

  const handleStartRecording = () => {
    if (recognition.current) {
      setIsRecording(true);
      setError(null);
      setVoiceCommand('');
      setProcessedCommand(null);
      audioChunks.current = [];
      recognition.current.start();
      if (mediaRecorder.current) {
        mediaRecorder.current.start();
      }
    }
  };

  const handleStopRecording = () => {
    if (recognition.current) {
      setIsRecording(false);
      recognition.current.stop();
      if (mediaRecorder.current) {
        mediaRecorder.current.stop();
      }
    }
  };

  const handleSubmit = async () => {
    if (!deliveryAddress || !paymentMethod) {
      setError(t('Please provide delivery address and payment method'));
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmOrder = async () => {
    try {
      setLoading(true);
      const orderData = {
        items: processedCommand.items,
        deliveryAddress,
        paymentMethod,
        preferredDeliveryTime,
        voiceCommand: {
          originalCommand: voiceCommand,
          processedCommand,
          audioBlob: audioChunks.current.length > 0
            ? new Blob(audioChunks.current, { type: 'audio/webm' })
            : null,
        },
      };

      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/orders');
    } catch (err) {
      setError(t('Error creating order. Please try again.'));
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const handleVoiceCommand = async (command) => {
    setIsProcessing(true);
    setCurrentCommand(command);
    
    try {
      // Process the voice command
      const processedCommand = processVoiceCommand(command, orderContext);
      
      // Add to command history
      setCommandHistory((prev) => [
        ...prev,
        {
          command,
          processed: processedCommand,
          timestamp: new Date(),
        },
      ]);

      // Generate and speak response
      const response = generateVoiceResponse(processedCommand, orderContext);
      setFeedbackText(response);
      speakResponse(response);

      // Handle different command types
      switch (processedCommand.type) {
        case 'order':
          if (processedCommand.confidence >= 0.7) {
            // Update order context
            setOrderContext((prev) => ({
              ...prev,
              ...processedCommand.extracted,
              previousCommand: command,
            }));
          }
          break;

        case 'confirmation':
          if (processedCommand.confirmationType === 'yes' && orderContext.product) {
            // Create order
            await handleOrderCreation();
          } else if (processedCommand.confirmationType === 'no') {
            // Clear order context
            setOrderContext({});
          }
          break;

        case 'general':
          if (processedCommand.generalType === 'cancel') {
            setOrderContext({});
          }
          break;

        default:
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const clearHistory = () => {
    setCommandHistory([]);
    setOrderContext({});
    setCurrentCommand(null);
    setFeedbackText('');
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {t('Voice Order')}
          </Typography>

          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              {t('Speak your order')}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                color={isRecording ? 'error' : 'primary'}
                size="large"
              >
                {isRecording ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              <Typography variant="body1" color={isRecording ? 'primary' : 'text.secondary'}>
                {isRecording
                  ? t('Listening... Speak your order')
                  : t('Click to start recording')}
              </Typography>
            </Box>
            {voiceCommand && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t('You said')}: "{voiceCommand}"
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {processedCommand && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t('Order Items')}
                </Typography>
                <List>
                  {processedCommand.items.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar src={item.product?.image}>
                          <ShoppingCartIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.product?.name}
                        secondary={`${item.quantity} ${item.unit} x ${formatCurrency(item.price)}`}
                      />
                      <Typography variant="body1">
                        {formatCurrency(item.quantity * item.price)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
                <Box mt={2} display="flex" justifyContent="space-between">
                  <Typography variant="h6">{t('Total')}</Typography>
                  <Typography variant="h6">{formatCurrency(cartTotal)}</Typography>
                </Box>
              </Box>

              <TextField
                label={t('Delivery Address')}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                multiline
                rows={2}
                required
                fullWidth
                InputProps={{
                  startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />,
                }}
              />

              <TextField
                select
                label={t('Payment Method')}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                fullWidth
                InputProps={{
                  startAdornment: <PaymentIcon color="action" sx={{ mr: 1 }} />,
                }}
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {t(method.label)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="datetime-local"
                label={t('Preferred Delivery Time')}
                value={preferredDeliveryTime}
                onChange={(e) => setPreferredDeliveryTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/cart')}
                  fullWidth
                >
                  {t('Back to Cart')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  fullWidth
                  disabled={loading || !deliveryAddress || !paymentMethod}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    t('Place Order')
                  )}
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('Confirm Order')}
          <IconButton
            onClick={() => setShowConfirmDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              {t('Please confirm your order details:')}
            </Typography>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('Delivery Address')}:
              </Typography>
              <Typography variant="body2" paragraph>
                {deliveryAddress}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('Payment Method')}:
              </Typography>
              <Typography variant="body2" paragraph>
                {t(PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label)}
              </Typography>
            </Box>
            {preferredDeliveryTime && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t('Preferred Delivery Time')}:
                </Typography>
                <Typography variant="body2" paragraph>
                  {new Date(preferredDeliveryTime).toLocaleString()}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('Total Amount')}:
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(cartTotal)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleConfirmOrder}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('Confirm Order')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('Voice Command History')}
        </Typography>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color={isListening ? 'error' : 'primary'}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              size="large"
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <Typography variant="body1">
              {isListening ? 'Listening...' : 'Click to start speaking'}
            </Typography>
            {isProcessing && <CircularProgress size={24} />}
          </Box>

          {currentCommand && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Current Command:
              </Typography>
              <Typography variant="body1">{currentCommand}</Typography>
            </Paper>
          )}

          {feedbackText && (
            <VoiceFeedback
              text={feedbackText}
              language={user?.preferences?.language}
              dialect={user?.preferences?.dialect}
            />
          )}

          {Object.keys(orderContext).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Order Context:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {orderContext.product && (
                  <Chip
                    label={`Product: ${orderContext.product.name}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {orderContext.quantity && (
                  <Chip
                    label={`Quantity: ${orderContext.quantity.value} ${orderContext.quantity.unit}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {orderContext.delivery?.address && (
                  <Chip
                    label={`Delivery: ${orderContext.delivery.address}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {orderContext.payment?.method && (
                  <Chip
                    label={`Payment: ${orderContext.payment.method}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Paper>
          )}
        </Stack>

        {commandHistory.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Command History</Typography>
              <IconButton onClick={clearHistory} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
            <Stack spacing={1}>
              {commandHistory.map((item, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {item.command}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Type: {item.processed.type} (Confidence: {Math.round(item.processed.confidence * 100)}%)
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default VoiceOrder; 