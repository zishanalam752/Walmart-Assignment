const axios = require('axios');
const { ApiError } = require('../middleware/error.middleware');
const Product = require('../models/product.model');

class VoiceService {
  constructor() {
    this.bharatGPTApiKey = process.env.BHARATGPT_API_KEY;
    this.bharatGPTApiUrl = process.env.BHARATGPT_API_URL;
    this.offlineModelPath = process.env.VOICE_MODEL_PATH;
  }

  // Process voice command using BharatGPT
  async processVoiceCommand(command, language, dialect = 'standard') {
    try {
      // Check if offline mode is enabled
      if (process.env.OFFLINE_MODE_ENABLED === 'true') {
        return this.processOfflineCommand(command, language, dialect);
      }

      // Process using BharatGPT API
      const response = await axios.post(
        `${this.bharatGPTApiUrl}/process`,
        {
          text: command,
          language,
          dialect,
          task: 'voice_commerce'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bharatGPTApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.processedText;
    } catch (error) {
      if (error.response) {
        throw new ApiError(
          error.response.status,
          `BharatGPT API error: ${error.response.data.message}`
        );
      }
      throw new ApiError(500, 'Error processing voice command');
    }
  }

  // Process command in offline mode
  async processOfflineCommand(command, language, dialect) {
    try {
      // In production, this would use a local model
      // For now, return a simple processed version
      return command.toLowerCase().trim();
    } catch (error) {
      throw new ApiError(500, 'Error processing offline command');
    }
  }

  // Extract order items from processed command
  async extractOrderItems(processedCommand, language, dialect) {
    try {
      // Check if offline mode is enabled
      if (process.env.OFFLINE_MODE_ENABLED === 'true') {
        return this.extractOfflineOrderItems(processedCommand, language, dialect);
      }

      // Extract items using BharatGPT API
      const response = await axios.post(
        `${this.bharatGPTApiUrl}/extract-items`,
        {
          text: processedCommand,
          language,
          dialect,
          context: 'voice_commerce'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bharatGPTApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const extractedItems = response.data.items;
      return await this.resolveOrderItems(extractedItems, language, dialect);
    } catch (error) {
      if (error.response) {
        throw new ApiError(
          error.response.status,
          `BharatGPT API error: ${error.response.data.message}`
        );
      }
      throw new ApiError(500, 'Error extracting order items');
    }
  }

  // Extract items in offline mode
  async extractOfflineOrderItems(processedCommand, language, dialect) {
    try {
      // In production, this would use a local model
      // For now, return empty array
      return [];
    } catch (error) {
      throw new ApiError(500, 'Error extracting offline order items');
    }
  }

  // Resolve extracted items to actual products
  async resolveOrderItems(extractedItems, language, dialect) {
    const resolvedItems = [];

    for (const item of extractedItems) {
      // Search for matching products
      const products = await Product.find({
        $or: [
          { name: { $regex: item.name, $options: 'i' } },
          { 'alternativeNames.name': { $regex: item.name, $options: 'i' } },
          { 'voicePatterns.patterns': { $regex: item.name, $options: 'i' } }
        ],
        isActive: true
      }).limit(1);

      if (products.length > 0) {
        const product = products[0];
        resolvedItems.push({
          product,
          quantity: item.quantity || 1,
          unit: item.unit || product.unit,
          price: product.price
        });
      }
    }

    return resolvedItems;
  }

  // Process confirmation command
  async processConfirmationCommand(command, originalCommand, language, dialect) {
    try {
      // Check if offline mode is enabled
      if (process.env.OFFLINE_MODE_ENABLED === 'true') {
        return this.processOfflineConfirmation(command, language, dialect);
      }

      // Process using BharatGPT API
      const response = await axios.post(
        `${this.bharatGPTApiUrl}/confirm`,
        {
          text: command,
          originalCommand,
          language,
          dialect,
          context: 'voice_commerce_confirmation'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bharatGPTApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.isConfirmed;
    } catch (error) {
      if (error.response) {
        throw new ApiError(
          error.response.status,
          `BharatGPT API error: ${error.response.data.message}`
        );
      }
      throw new ApiError(500, 'Error processing confirmation command');
    }
  }

  // Process confirmation in offline mode
  async processOfflineConfirmation(command, language, dialect) {
    try {
      // In production, this would use a local model
      // For now, check for common confirmation words
      const confirmWords = {
        hindi: ['हाँ', 'हां', 'बिलकुल', 'ठीक है', 'सही है'],
        english: ['yes', 'yeah', 'sure', 'okay', 'correct'],
        // Add more languages as needed
      };

      const words = confirmWords[language] || confirmWords.english;
      return words.some(word => 
        command.toLowerCase().includes(word.toLowerCase())
      );
    } catch (error) {
      throw new ApiError(500, 'Error processing offline confirmation');
    }
  }

  // Generate voice response
  async generateVoiceResponse(text, language, dialect) {
    try {
      // Check if offline mode is enabled
      if (process.env.OFFLINE_MODE_ENABLED === 'true') {
        return this.generateOfflineVoiceResponse(text, language, dialect);
      }

      // Generate response using BharatGPT API
      const response = await axios.post(
        `${this.bharatGPTApiUrl}/generate-voice`,
        {
          text,
          language,
          dialect,
          context: 'voice_commerce_response'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bharatGPTApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.voiceResponse;
    } catch (error) {
      if (error.response) {
        throw new ApiError(
          error.response.status,
          `BharatGPT API error: ${error.response.data.message}`
        );
      }
      throw new ApiError(500, 'Error generating voice response');
    }
  }

  // Generate voice response in offline mode
  async generateOfflineVoiceResponse(text, language, dialect) {
    try {
      // In production, this would use a local text-to-speech model
      // For now, return the text as is
      return text;
    } catch (error) {
      throw new ApiError(500, 'Error generating offline voice response');
    }
  }

  // Train voice patterns for a product
  async trainVoicePatterns(productId, patterns, language, dialect) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Add or update voice patterns
      const existingPatternIndex = product.voicePatterns.findIndex(
        p => p.language === language && p.dialect === dialect
      );

      if (existingPatternIndex >= 0) {
        product.voicePatterns[existingPatternIndex].patterns = patterns;
      } else {
        product.voicePatterns.push({
          language,
          dialect,
          patterns
        });
      }

      await product.save();
      return product;
    } catch (error) {
      throw new ApiError(500, 'Error training voice patterns');
    }
  }
}

module.exports = new VoiceService(); 