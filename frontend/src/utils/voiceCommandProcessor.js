// Voice command processing utility
const VOICE_COMMAND_PATTERNS = {
  // Product quantity patterns
  quantity: {
    exact: /(\d+)\s*(?:kg|g|liters?|l|pieces?|pcs?|units?|nos?)/i,
    approximate: /(?:about|around|approximately|roughly)\s*(\d+)\s*(?:kg|g|liters?|l|pieces?|pcs?|units?|nos?)/i,
    range: /(?:between|from)\s*(\d+)\s*(?:to|and)\s*(\d+)\s*(?:kg|g|liters?|l|pieces?|pcs?|units?|nos?)/i,
  },

  // Delivery patterns
  delivery: {
    address: /(?:deliver|ship|send)\s*(?:to|at)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
    time: /(?:deliver|ship|send)\s*(?:by|at|on)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
    instructions: /(?:delivery|shipping)\s*(?:instructions?|note|notes)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
  },

  // Payment patterns
  payment: {
    method: /(?:pay|payment)\s*(?:by|using|with|through)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
    split: /(?:split|divide)\s*(?:payment|bill)\s*(?:into|by)\s*(\d+)\s*(?:parts?|ways?)/i,
  },

  // Product patterns
  product: {
    name: /(?:get|buy|order|purchase)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
    category: /(?:from|in|under)\s*(?:category|section)\s*(.+?)(?:\s*(?:please|pls|plz|thanks|thank you|tq|ty)|$)/i,
    price: /(?:under|below|less than|maximum|max)\s*(?:price|cost)\s*(?:of|is)?\s*(?:rs\.?|inr)?\s*(\d+)/i,
  },

  // Confirmation patterns
  confirmation: {
    yes: /^(?:yes|yeah|yep|sure|ok|okay|fine|alright|correct|right|confirm|confirmed)$/i,
    no: /^(?:no|nope|nah|cancel|cancelled|wrong|incorrect|deny|denied)$/i,
    maybe: /^(?:maybe|perhaps|not sure|unsure|doubt|doubtful)$/i,
  },

  // General patterns
  general: {
    help: /^(?:help|assist|guide|support|how to|how do i|what can i do)$/i,
    cancel: /^(?:cancel|stop|abort|terminate|end)$/i,
    repeat: /^(?:repeat|say again|pardon|what|huh|excuse me)$/i,
  },
};

const extractQuantity = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.quantity;
  
  // Try exact quantity first
  const exactMatch = command.match(patterns.exact);
  if (exactMatch) {
    return {
      type: 'exact',
      value: parseInt(exactMatch[1]),
      unit: exactMatch[0].match(/(kg|g|l|liters?|pieces?|pcs?|units?|nos?)/i)[0],
    };
  }

  // Try approximate quantity
  const approxMatch = command.match(patterns.approximate);
  if (approxMatch) {
    return {
      type: 'approximate',
      value: parseInt(approxMatch[1]),
      unit: approxMatch[0].match(/(kg|g|l|liters?|pieces?|pcs?|units?|nos?)/i)[0],
    };
  }

  // Try quantity range
  const rangeMatch = command.match(patterns.range);
  if (rangeMatch) {
    return {
      type: 'range',
      min: parseInt(rangeMatch[1]),
      max: parseInt(rangeMatch[2]),
      unit: rangeMatch[0].match(/(kg|g|l|liters?|pieces?|pcs?|units?|nos?)/i)[0],
    };
  }

  return null;
};

const extractDeliveryInfo = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.delivery;
  const info = {};

  const addressMatch = command.match(patterns.address);
  if (addressMatch) {
    info.address = addressMatch[1].trim();
  }

  const timeMatch = command.match(patterns.time);
  if (timeMatch) {
    info.time = timeMatch[1].trim();
  }

  const instructionsMatch = command.match(patterns.instructions);
  if (instructionsMatch) {
    info.instructions = instructionsMatch[1].trim();
  }

  return Object.keys(info).length > 0 ? info : null;
};

const extractPaymentInfo = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.payment;
  const info = {};

  const methodMatch = command.match(patterns.method);
  if (methodMatch) {
    const method = methodMatch[1].trim().toLowerCase();
    info.method = method.includes('cash') ? 'cash_on_delivery' :
                 method.includes('upi') ? 'upi' :
                 method.includes('card') ? 'card' : method;
  }

  const splitMatch = command.match(patterns.split);
  if (splitMatch) {
    info.splitCount = parseInt(splitMatch[1]);
  }

  return Object.keys(info).length > 0 ? info : null;
};

const extractProductInfo = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.product;
  const info = {};

  const nameMatch = command.match(patterns.name);
  if (nameMatch) {
    info.name = nameMatch[1].trim();
  }

  const categoryMatch = command.match(patterns.category);
  if (categoryMatch) {
    info.category = categoryMatch[1].trim();
  }

  const priceMatch = command.match(patterns.price);
  if (priceMatch) {
    info.maxPrice = parseInt(priceMatch[1]);
  }

  return Object.keys(info).length > 0 ? info : null;
};

const isConfirmation = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.confirmation;
  
  if (patterns.yes.test(command)) {
    return { type: 'yes' };
  }
  if (patterns.no.test(command)) {
    return { type: 'no' };
  }
  if (patterns.maybe.test(command)) {
    return { type: 'maybe' };
  }
  
  return null;
};

const isGeneralCommand = (command) => {
  const patterns = VOICE_COMMAND_PATTERNS.general;
  
  if (patterns.help.test(command)) {
    return { type: 'help' };
  }
  if (patterns.cancel.test(command)) {
    return { type: 'cancel' };
  }
  if (patterns.repeat.test(command)) {
    return { type: 'repeat' };
  }
  
  return null;
};

const processVoiceCommand = (command, context = {}) => {
  const result = {
    type: 'unknown',
    originalCommand: command,
    extracted: {},
    confidence: 0,
  };

  // Check for general commands first
  const generalCommand = isGeneralCommand(command);
  if (generalCommand) {
    return {
      ...result,
      type: 'general',
      generalType: generalCommand.type,
      confidence: 1,
    };
  }

  // Check for confirmation
  const confirmation = isConfirmation(command);
  if (confirmation) {
    return {
      ...result,
      type: 'confirmation',
      confirmationType: confirmation.type,
      confidence: 1,
    };
  }

  // Extract product information
  const productInfo = extractProductInfo(command);
  if (productInfo) {
    result.type = 'product';
    result.extracted.product = productInfo;
    result.confidence += 0.3;
  }

  // Extract quantity information
  const quantityInfo = extractQuantity(command);
  if (quantityInfo) {
    result.type = 'order';
    result.extracted.quantity = quantityInfo;
    result.confidence += 0.3;
  }

  // Extract delivery information
  const deliveryInfo = extractDeliveryInfo(command);
  if (deliveryInfo) {
    result.type = 'order';
    result.extracted.delivery = deliveryInfo;
    result.confidence += 0.2;
  }

  // Extract payment information
  const paymentInfo = extractPaymentInfo(command);
  if (paymentInfo) {
    result.type = 'order';
    result.extracted.payment = paymentInfo;
    result.confidence += 0.2;
  }

  // Apply context-based adjustments
  if (context.previousCommand) {
    // If we have a previous command, we might be in a confirmation or clarification flow
    if (result.confidence < 0.5) {
      result.type = 'clarification';
      result.confidence = 0.8;
    }
  }

  return result;
};

const generateVoiceResponse = (processedCommand, context = {}) => {
  const { type, generalType, confirmationType, extracted, confidence } = processedCommand;

  if (type === 'general') {
    switch (generalType) {
      case 'help':
        return 'I can help you place an order. You can say things like "I want to buy 2 kg of rice" or "Order 5 pieces of bread".';
      case 'cancel':
        return 'Order cancelled. Is there anything else I can help you with?';
      case 'repeat':
        return 'I heard: ' + processedCommand.originalCommand;
      default:
        return 'I\'m not sure how to help with that. You can say "help" to learn what I can do.';
    }
  }

  if (type === 'confirmation') {
    switch (confirmationType) {
      case 'yes':
        return 'Great! I\'ll proceed with your order.';
      case 'no':
        return 'I\'ll cancel that. Would you like to try something else?';
      case 'maybe':
        return 'Would you like me to explain the order details again?';
      default:
        return 'I didn\'t quite catch that. Could you please confirm?';
    }
  }

  if (type === 'order') {
    const parts = [];
    
    if (extracted.product) {
      parts.push(`I'll order ${extracted.product.name}`);
    }
    
    if (extracted.quantity) {
      const { type, value, unit, min, max } = extracted.quantity;
      if (type === 'exact') {
        parts.push(`${value} ${unit}`);
      } else if (type === 'approximate') {
        parts.push(`around ${value} ${unit}`);
      } else if (type === 'range') {
        parts.push(`between ${min} and ${max} ${unit}`);
      }
    }
    
    if (extracted.delivery) {
      if (extracted.delivery.address) {
        parts.push(`to be delivered to ${extracted.delivery.address}`);
      }
      if (extracted.delivery.time) {
        parts.push(`by ${extracted.delivery.time}`);
      }
    }
    
    if (extracted.payment) {
      parts.push(`payment by ${extracted.payment.method}`);
      if (extracted.payment.splitCount) {
        parts.push(`split into ${extracted.payment.splitCount} parts`);
      }
    }

    if (parts.length > 0) {
      return parts.join(', ') + '. Is that correct?';
    }
  }

  if (type === 'clarification') {
    return 'I\'m not sure I understood correctly. Could you please repeat your order?';
  }

  return 'I didn\'t quite understand that. Could you please try again?';
};

export {
  processVoiceCommand,
  generateVoiceResponse,
  extractQuantity,
  extractDeliveryInfo,
  extractPaymentInfo,
  extractProductInfo,
  isConfirmation,
  isGeneralCommand,
}; 