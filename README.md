# Bhashini Voice Bazaar

A hyper-local voice commerce platform enabling seamless shopping experience in 15+ Indian dialects through voice commands.

## 🌟 Features

- Voice-based shopping in 15+ Indian dialects
- Offline mode support for low-connectivity areas
- WhatsApp integration for easy access
- Edge AI processing for low-end devices
- BharatGPT-powered natural language understanding
- Support for colloquial phrases and local dialects

## 🏗️ Tech Stack

### Frontend
- React Native (Mobile App)
- Redux for state management
- React Navigation
- Voice processing libraries

### Backend
- Node.js with Express
- MongoDB (Database)
- Redis (Caching)
- WebSocket for real-time communication

### AI/ML
- BharatGPT (India's open-source LLM)
- Edge AI for offline processing
- Multilingual NLP pipeline
- Voice recognition and processing

### Infrastructure
- Docker for containerization
- AWS/GCP for cloud services
- CI/CD pipeline

## 📱 Supported Platforms

- Android (Primary)
- iOS (Secondary)
- WhatsApp Business API

## 🗣️ Supported Languages/Dialects

- Hindi
- Tamil
- Kannada
- Bhojpuri
- Bengali
- Marathi
- Gujarati
- And more...

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- React Native development environment
- Android Studio / Xcode
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bhashini-voice-bazaar.git
cd bhashini-voice-bazaar
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

4. Start the development servers:
```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd ../frontend
npm start
```

## 📁 Project Structure

```
bhashini-voice-bazaar/
├── frontend/                 # React Native mobile app
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── screens/         # App screens
│   │   ├── navigation/      # Navigation configuration
│   │   ├── services/        # API services
│   │   ├── store/          # Redux store
│   │   └── utils/          # Utility functions
│   └── assets/             # Images, fonts, etc.
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── middleware/     # Custom middleware
│   └── config/             # Configuration files
├── ml/                     # AI/ML components
│   ├── models/             # ML models
│   ├── training/           # Training scripts
│   └── inference/          # Inference scripts
└── docs/                   # Documentation
```

## 🔧 Environment Variables

### Backend (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bhashini
JWT_SECRET=your_jwt_secret
WHATSAPP_API_KEY=your_whatsapp_api_key
BHARATGPT_API_KEY=your_bharatgpt_api_key
```

### Frontend (.env)
```
API_URL=http://localhost:3000
WHATSAPP_BUSINESS_ID=your_whatsapp_business_id
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- BharatGPT team for the open-source LLM
- All contributors and supporters of the project
- The open-source community

## 📞 Support

For support, email support@bhashinivoicebazaar.com or join our Slack channel. 