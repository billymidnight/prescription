# Medicare Clinic Prescription App

A modern web application for clinics to write and manage medical prescriptions.

## 🔥 Tech Stack

### Frontend
- React 18.3 + TypeScript
- Vite 5.4
- React Router 6.30
- Zustand 5.0 (State Management)
- Axios (HTTP Client)
- Supabase Auth

### Backend
- Python 3.12
- Flask 2.2
- Supabase PostgreSQL
- SQLAlchemy
- Flask-CORS

## 📁 Project Structure

```
prescription/
├── backend/           # Python Flask API
│   ├── api/          # API routes and endpoints
│   ├── database/     # Database helpers
│   ├── models/       # Data models
│   ├── services/     # Business logic
│   ├── utils/        # Utility functions
│   └── app.py        # Flask entry point
│
└── frontend/         # React TypeScript app
    ├── src/
    │   ├── lib/      # Shared libraries
    │   │   ├── api/  # API client
    │   │   └── state/# Zustand stores
    │   ├── pages/    # Page components
    │   └── App.tsx   # Main app component
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- Supabase account

### Environment Setup

#### 1. Backend Setup
```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and fill in your Supabase credentials
cp .env.example .env
```

#### 2. Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install

# Configure environment variables
# Copy frontend/.env.example to frontend/.env and fill in your Supabase credentials
```

### Running the Application

#### Terminal 1 - Backend:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```
Backend runs on: `http://localhost:4000`

#### Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:3000`

## 🔧 Configuration

### Backend `.env`
```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
FLASK_ENV=development
```

### Frontend `.env`
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:4000/api
```

## 📊 Database Setup

### Required Supabase Tables

#### Users Table
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = user_id);
```

## ✅ Verification

1. **Backend Health Check**: Visit `http://localhost:4000/health`
2. **Frontend**: Visit `http://localhost:3000`
3. Check browser console for Supabase connection logs

## 📦 Deployment

### Backend (Render/Railway)
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app`

### Frontend (Vercel)
- Framework: Vite
- Build: `npm run build`
- Output: `dist`

## 🎯 Next Steps

1. Set up Supabase tables
2. Implement prescription features
3. Add user authentication flow
4. Build prescription management UI
5. Add PDF generation for prescriptions

## 📞 Support

For detailed setup instructions, see `COMPLETE_PROJECT_SETUP_SPECIFICATION.md`
