import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const VoiceFeedback = ({
  text,
  language = 'en-IN',
  dialect = 'standard',
  autoPlay = true,
  onSpeakStart,
  onSpeakEnd,
  onError,
  showControls = true,
  size = 'medium',
  variant = 'contained',
}) => {
  const { t } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const speechSynthesis = useRef(window.speechSynthesis);
  const recognition = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = `${language}-${dialect}`;

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onSpeakEnd) {
          onSpeakEnd(transcript);
        }
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(t('Voice recognition error. Please try again.'));
        if (onError) {
          onError(event.error);
        }
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (speechSynthesis.current) {
        speechSynthesis.current.cancel();
      }
    };
  }, [language, dialect, onSpeakEnd, onError, t]);

  useEffect(() => {
    if (autoPlay && text && !isMuted) {
      speakText(text);
    }
  }, [text, autoPlay, isMuted]);

  const speakText = (textToSpeak) => {
    if (!speechSynthesis.current || isMuted) return;

    try {
      speechSynthesis.current.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = `${language}-${dialect}`;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (onSpeakStart) {
          onSpeakStart();
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onSpeakEnd) {
          onSpeakEnd();
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setError(t('Error playing voice feedback. Please try again.'));
        if (onError) {
          onError(event);
        }
      };

      speechSynthesis.current.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setError(t('Error playing voice feedback. Please try again.'));
      if (onError) {
        onError(err);
      }
    }
  };

  const handleSpeakClick = () => {
    if (isSpeaking) {
      speechSynthesis.current.cancel();
    } else {
      speakText(text);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (isSpeaking) {
      speechSynthesis.current.cancel();
    }
  };

  const handleListenClick = () => {
    if (isListening) {
      recognition.current.stop();
    } else {
      setIsListening(true);
      recognition.current.start();
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return 'medium';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        };
    }
  };

  return (
    <Paper
      elevation={variant === 'text' ? 0 : 1}
      sx={{
        p: 2,
        ...getVariantStyles(),
      }}
    >
      <Stack spacing={2}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box display="flex" alignItems="center" gap={2}>
          {showControls && (
            <>
              <IconButton
                onClick={handleSpeakClick}
                color={isSpeaking ? 'error' : 'primary'}
                size={getIconSize()}
              >
                {isSpeaking ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <VolumeUpIcon />
                )}
              </IconButton>

              <IconButton
                onClick={handleMuteToggle}
                color={isMuted ? 'error' : 'primary'}
                size={getIconSize()}
              >
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>

              {'webkitSpeechRecognition' in window && (
                <IconButton
                  onClick={handleListenClick}
                  color={isListening ? 'error' : 'primary'}
                  size={getIconSize()}
                >
                  {isListening ? <MicOffIcon /> : <MicIcon />}
                </IconButton>
              )}
            </>
          )}

          <Typography
            variant={size === 'small' ? 'body2' : 'body1'}
            color={variant === 'contained' ? 'primary.contrastText' : 'text.primary'}
          >
            {text}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default VoiceFeedback; 