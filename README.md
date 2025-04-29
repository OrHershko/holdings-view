
# Holdings View

A comprehensive financial investment platform built with React, TypeScript, and FastAPI, featuring advanced charting capabilities, portfolio management, and AI-powered stock analysis.

## 🚀 Features

- **Modern Tech Stack**: Built with React 18, TypeScript, Vite for frontend and FastAPI (Python) for backend
- **Advanced Charting**: Integration with ApexCharts and Lightweight Charts for financial data visualization
- **Portfolio Management**: Track investments, monitor performance, and analyze returns
- **Multi-Stock Management**: Add multiple stocks at once via manual entry or CSV upload
- **AI Analysis**: Get AI-powered insights and recommendations for your stock portfolio
- **Authentication**: Secure user authentication via Firebase
- **Comprehensive UI Components**: Utilizing Radix UI primitives for accessible and customizable components
- **Responsive Design**: Built with Tailwind CSS for a mobile-first approach
- **Form Handling**: Integrated with React Hook Form and Zod for robust form validation
- **State Management**: Uses TanStack Query for efficient server state management
- **Routing**: Implements React Router for seamless navigation
- **Theme Support**: Dark/Light mode support via next-themes
- **Technical Analysis**: Includes technical indicators for financial analysis

## 🛠️ Technology Stack

### Frontend
- **Core**:
  - React 18.3
  - TypeScript
  - Vite

- **UI Components**:
  - Radix UI (comprehensive component library)
  - Tailwind CSS
  - Class Variance Authority
  - Lucide React (icons)

- **Data Visualization**:
  - ApexCharts
  - Lightweight Charts
  - Recharts

- **State Management & Data Fetching**:
  - TanStack Query (React Query)

- **Form Management**:
  - React Hook Form
  - Zod (validation)

- **Authentication**:
  - Firebase Authentication

- **Other Frontend Libraries**:
  - dnd-kit (drag and drop)
  - date-fns (date manipulation)
  - papaparse (CSV parsing)
  - framer-motion (animations)

### Backend
- **Core**:
  - FastAPI (Python)
  - SQLAlchemy ORM
  - Alembic (database migrations)

- **Data Sources**:
  - Yahoo Finance API
  - Custom financial data providers

- **Authentication**:
  - Firebase Authentication integration

## 📦 Project Structure

```
finvest-ios-focus/
├── src/                     # Frontend source code
│   ├── components/          # Reusable UI components
│   ├── pages/               # Application pages/routes
│   ├── services/            # API and service integrations
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts
│   ├── api/                 # Frontend API client code
│   ├── lib/                 # Utility functions and helpers
│   ├── data/                # Static data and constants
│   └── types.ts             # TypeScript type definitions
├── public/                  # Static assets
├── api/                     # Backend API
│   ├── auth/                # Authentication logic
│   ├── database/            # Database models and connection
│   ├── models/              # SQLAlchemy models
│   ├── routes/              # API endpoints
│   ├── schemas/             # Pydantic schemas
│   └── utils/               # Utility functions
├── alembic/                 # Database migration scripts
├── .venv/                   # Python virtual environment
└── configuration files      # Various config files
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ or Bun
- Python 3.9+
- Git

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd finvest-ios-focus
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the following configuration:
   ```
   VITE_API_URL=http://localhost:8000
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

### Backend Setup

1. **Set up Python virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows, use .venv\Scripts\activate
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root with the following:
   ```
   DATABASE_URL=sqlite:///./finvest.db
   FRONTEND_URL=http://localhost:5173
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server**
   ```bash
   python -m api.main
   ```

## 📝 Available Scripts

### Frontend
- `dev`: Start development server
- `build`: Build for production
- `build:dev`: Build for development
- `lint`: Run ESLint
- `preview`: Preview production build

### Backend
- `python -m api.main`: Start the FastAPI server
- `alembic revision --autogenerate -m "message"`: Create a new database migration
- `alembic upgrade head`: Apply all migrations

## 💼 Key Components

### AddStockDialog
The AddStockDialog component allows users to add stocks to their portfolio in two ways:
- **Manual Entry**: Add multiple stocks at once with validation
- **CSV Upload**: Import stocks from a CSV file with proper formatting

### Portfolio Dashboard
The main dashboard provides a comprehensive view of your investment portfolio:
- Performance metrics and charts
- Stock allocation visualization
- Gain/loss tracking
- Historical performance

### AI Analysis
Get AI-powered insights about your portfolio:
- Risk assessment
- Diversification recommendations
- Performance predictions
- Market trend analysis

## 🔧 Configuration Files

- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `postcss.config.js`: PostCSS configuration
- `eslint.config.js`: ESLint configuration
- `vite.config.ts`: Vite configuration
- `alembic.ini`: Alembic migration configuration

## 🔒 Authentication

The application uses Firebase Authentication to secure user data:
- Email/password authentication
- Social login options
- JWT token handling
- Secure API endpoints

## 🌐 Deployment

The application can be deployed to various platforms:
- Frontend: Vercel, Netlify, or any static hosting
- Backend: Render, Heroku, or any Python-compatible hosting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.
```

