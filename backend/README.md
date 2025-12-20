# Medicare Clinic Backend API

Flask-based REST API for the Medicare Clinic prescription management system.

## Tech Stack
- **Python 3.12+**
- **Flask 2.2** - Web framework
- **Supabase** - Database and authentication
- **Flask-CORS** - Cross-origin resource sharing
- **Gunicorn** - Production WSGI server

## Setup Instructions

### 1. Create Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```powershell
cp .env.example .env
```

Edit `.env` with your actual values:
- `SUPABASE_URL` - From Supabase project settings
- `SUPABASE_KEY` - Anon key from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase

### 4. Run Development Server
```powershell
python app.py
```

Server will run on: `http://localhost:4000`

### 5. Test API
Visit: `http://localhost:4000/health`

Should return:
```json
{
  "status": "ok",
  "message": "Medicare Clinic API is running"
}
```

## Project Structure
```
backend/
├── api/
│   ├── __init__.py
│   └── routes.py           # API endpoints
├── database/
│   ├── __init__.py
│   └── db_repo.py          # Database helpers
├── services/
│   ├── __init__.py
│   └── business_logic.py   # Business logic
├── utils/
│   ├── __init__.py
│   └── helpers.py          # Utility functions
├── models/
│   ├── __init__.py
│   └── base.py             # SQLAlchemy models (optional)
├── app.py                  # Flask app entry point
├── supabase_client.py      # Supabase client
├── requirements.txt        # Python dependencies
└── .env                    # Environment variables (DO NOT COMMIT)
```

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Authentication
- `GET /api/auth/me` - Get current user info (requires auth)

### Placeholders
- `GET /api/home` - Homepage data
- `GET /api/dashboard` - Dashboard data (requires auth)

## Adding New Routes

1. Open `api/routes.py`
2. Add new route function:
```python
@api_bp.route('/your-route', methods=['GET', 'OPTIONS'])
def your_function():
    if request.method == 'OPTIONS':
        return ('', 200)
    
    # Your logic here
    return jsonify({"data": "your data"}), 200
```

3. For protected routes, use:
```python
user_id = _get_user_from_header(request)
if not user_id:
    return jsonify({"error": "Unauthorized"}), 401
```

## Deployment

### Using Gunicorn (Production)
```powershell
gunicorn app:app --bind 0.0.0.0:4000
```

### Deploy to Render/Railway
1. Connect GitHub repository
2. Set environment variables in platform
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`

## Environment Variables

Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `PORT` - Server port (default: 4000)

Optional:
- `FLASK_ENV` - Environment mode (development/production)
- `JWT_SECRET` - JWT secret key
- `DATABASE_URL` - Direct PostgreSQL connection (if needed)
