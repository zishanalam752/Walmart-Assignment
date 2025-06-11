const OpenAI = require('openai');
const logger = require('../utils/logger');

class ChatGPTService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 150;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
  }

  async processVoiceCommand(command, context = {}) {
    try {
      const prompt = this._buildPrompt(command, context);
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a voice command processor for an e-commerce platform. 
            Your task is to extract structured information from voice commands.
            Focus on identifying:
            1. Product details (name, category, price range)
            2. Quantity and units
            3. Delivery information (address, time)
            4. Payment preferences
            5. Confirmation or general commands
            
            Respond in JSON format with the following structure:
            {
              "type": "order|confirmation|general|unknown",
              "confidence": 0.0 to 1.0,
              "extracted": {
                "product": { "name": "", "category": "", "maxPrice": null },
                "quantity": { "type": "exact|approximate|range", "value": null, "unit": "", "min": null, "max": null },
                "delivery": { "address": "", "time": "", "instructions": "" },
                "payment": { "method": "", "splitCount": null }
              },
              "generalType": "help|cancel|repeat|null",
              "confirmationType": "yes|no|maybe|null"
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const result = JSON.parse(response.choices[0].message.content);
      logger.debug('ChatGPT processed command:', { command, result });
      return result;
    } catch (error) {
      logger.error('Error processing voice command with ChatGPT:', error);
      throw new Error('Failed to process voice command');
    }
  }

  async generateVoiceResponse(processedCommand, context = {}) {
    try {
      const prompt = this._buildResponsePrompt(processedCommand, context);
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful voice assistant for an e-commerce platform.
            Generate natural, conversational responses to user commands.
            Keep responses concise and clear.
            Use a friendly, helpful tone.
            Include relevant order details in confirmations.
            Ask for clarification when needed.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const result = response.choices[0].message.content.trim();
      logger.debug('ChatGPT generated response:', { processedCommand, result });
      return result;
    } catch (error) {
      logger.error('Error generating voice response with ChatGPT:', error);
      return 'I apologize, but I had trouble processing that. Could you please try again?';
    }
  }

  _buildPrompt(command, context) {
    return `Process the following voice command in the context of an e-commerce order:
    Command: "${command}"
    Previous Context: ${JSON.stringify(context)}
    
    Extract all relevant information and respond in the specified JSON format.`;
  }

  _buildResponsePrompt(processedCommand, context) {
    const { type, extracted, generalType, confirmationType } = processedCommand;
    
    let prompt = `Generate a natural response for the following processed command:\n`;
    prompt += `Type: ${type}\n`;
    
    if (type === 'order') {
      prompt += `Extracted Information:\n`;
      if (extracted.product) prompt += `- Product: ${JSON.stringify(extracted.product)}\n`;
      if (extracted.quantity) prompt += `- Quantity: ${JSON.stringify(extracted.quantity)}\n`;
      if (extracted.delivery) prompt += `- Delivery: ${JSON.stringify(extracted.delivery)}\n`;
      if (extracted.payment) prompt += `- Payment: ${JSON.stringify(extracted.payment)}\n`;
    } else if (type === 'general') {
      prompt += `General Command Type: ${generalType}\n`;
    } else if (type === 'confirmation') {
      prompt += `Confirmation Type: ${confirmationType}\n`;
    }
    
    prompt += `Context: ${JSON.stringify(context)}\n`;
    prompt += `Generate a natural, conversational response.`;
    
    return prompt;
  }
}

module.exports = new ChatGPTService(); 