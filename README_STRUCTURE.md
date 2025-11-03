# Rtrack Project Structure

## Overview
This is a modular employee and attendance management system with a clean separation between frontend and backend.

## Directory Structure

```
rtrack/
├── backend/                    # Backend API (FastAPI)
│   ├── __init__.py
│   ├── main.py                # FastAPI application entry point
│   ├── database.py            # Database configuration and session management
│   ├── auth.py                # Authentication and authorization
│   ├── config/                # Configuration settings
│   │   └── __init__.py
│   ├── models/                # SQLModel database models
│   │   └── __init__.py
│   ├── routes/                # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── employees.py
│   │   ├── attendance.py
│   │   ├── compliance.py
│   │   └── legacy.py
│   ├── services/              # Business logic services
│   │   ├── __init__.py
│   │   ├── attendance_service.py
│   │   ├── compliance_service.py
│   │   ├── compliance_utils.py
│   │   ├── compliance_weekly.py
│   │   ├── compliance_monthly.py
│   │   └── compliance_quarterly.py
│   └── utils/                 # Utility functions
│       ├── __init__.py
│       ├── utils.py
│       └── attendance_parser.py
│
├── frontend/                   # Frontend application (Next.js)
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   ├── lib/                   # Frontend utilities and API client
│   └── ...                    # Other Next.js files
│
├── requirements.txt           # Python dependencies
├── employees.db               # SQLite database
└── README.md                  # Main project documentation
```

## Key Features

### Backend Organization
- **Modular**: Clear separation of concerns with routes, services, and utilities
- **Scalable**: Easy to add new features without affecting existing code
- **Maintainable**: Consistent structure makes it easy to find and modify code
- **Type-safe**: Uses SQLModel for database models with type hints

### Frontend Organization
- **Component-based**: Reusable React components
- **API abstraction**: Centralized API client in `lib/api.ts`
- **Route protection**: Admin and protected route components

## Running the Application

### Backend
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

