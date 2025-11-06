# Rtrack - Employee and Attendance Management System

A comprehensive employee and attendance management system with compliance tracking capabilities.

## Features

- **Employee Management**: Upload and manage employee data via Excel files
- **Exception Management**: Create and manage employee exceptions (format: `{period}_{number}_day`, `default`, `other`)
- **Attendance Tracking**: Upload attendance records and track employee presence
- **Compliance Tracking**: 
  - Weekly compliance (automatically calculated after attendance upload)
  - Monthly compliance (on-demand calculation)
  - Quarterly compliance (on-demand calculation)
- **Role-Based Access Control**: 
  - Admin users: Full access to all features
  - Regular employees: Access to own compliance and direct reportees
- **Pivot Table Views**: Easy-to-read compliance data organized by time periods
- **Modern UI**: Sleek design with gradients, glassmorphism, and animated backgrounds

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLModel**: Database ORM with type hints
- **SQLite**: Database storage
- **Pandas**: Excel file processing and data analysis

### Frontend
- **Next.js**: React framework with SSR
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library

## Project Structure

```
rtrack/
├── backend/          # FastAPI backend application
│   ├── main.py      # FastAPI application entry point
│   ├── database.py   # Database configuration
│   ├── auth.py      # Authentication and authorization
│   ├── config/      # Configuration settings
│   ├── models/      # SQLModel database models
│   ├── routes/      # API route handlers
│   ├── services/    # Business logic services
│   ├── utils/       # Utility functions
│   └── requirements.txt  # Python dependencies
├── frontend/         # Next.js frontend application
│   ├── app/         # Next.js app directory
│   ├── components/  # React components
│   └── lib/         # Frontend utilities and API client
└── rtrack.db         # SQLite database (created automatically)
```

## Prerequisites

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** and **npm** - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/downloads)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rtrack
```

### 2. Backend Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

**Default Admin Credentials:**
- Username: `admin`
- Password: `password`

*Note: Change these credentials in production!*

## Configuration

### Backend Environment Variables (Optional)

Create a `.env` file in the `backend` directory:

```env
SECRET_KEY=your-secret-key-change-this-in-production
DATABASE_URL=sqlite:///./rtrack.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
DEBUG=False
LOG_LEVEL=INFO
```

### Frontend Environment Variables (Optional)

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Authentication
- `POST /auth/token` - Login endpoint
- `GET /auth/me` - Get current user information

### Employees
- `GET /employees?page=1&page_size=50` - Get employees (paginated, admin only)
- `POST /employees` - Create employee (admin only)
- `GET /employees/{employee_id}` - Get employee by ID (admin only)
- `PATCH /employees/{employee_id}` - Update employee (admin only)
- `DELETE /employees/{employee_id}` - Delete employee (admin only)
- `POST /employees/upload` - Upload employee Excel file (admin only)

### Attendance
- `POST /attendance/upload` - Upload attendance Excel file (admin only)
- `GET /attendance?page=1&page_size=100` - Get attendance records (paginated)
- `GET /attendance/last-upload` - Get last upload information (admin only)

### Compliance
- `GET /compliance?year=2024&month=1&status=Active` - Get weekly compliance (pivot format)
- `POST /compliance/monthly/calculate?year=2024&month=1` - Calculate monthly compliance (admin only)
- `GET /compliance/monthly?year=2024&status=Active` - Get monthly compliance (pivot format)
- `POST /compliance/quarterly/calculate?year=2024&quarter=1` - Calculate quarterly compliance (admin only)
- `GET /compliance/quarterly?year=2024&status=Active` - Get quarterly compliance (pivot format)

### Exceptions
- `GET /exceptions?page=1&page_size=50` - Get all exceptions (paginated, admin only)
- `POST /exceptions` - Create exception (admin only)
- `GET /exceptions/{id}` - Get exception by ID (admin only)
- `PUT /exceptions/{id}` - Update exception (admin only)
- `DELETE /exceptions/{id}` - Delete exception (admin only)
- `POST /exceptions/populate` - Populate exceptions from employee records (admin only)

## Performance Optimizations

### Backend
- ✅ Pagination on all list endpoints
- ✅ Database query optimization with indexes
- ✅ Connection pooling for PostgreSQL
- ✅ Response compression
- ✅ Efficient data processing

### Frontend
- ✅ Code splitting and lazy loading
- ✅ Optimized bundle size
- ✅ Memoization for expensive computations
- ✅ Efficient re-renders
- ✅ Optimized package imports

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

**Database errors:**
```bash
rm backend/rtrack.db  # Delete and restart
```

### Frontend Issues

**Port 3000 already in use:**
```bash
npm run dev -- -p 3001
```

**Cannot connect to backend:**
- Verify backend is running on http://localhost:8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is properly configured

## Development

The project follows a modular architecture:
- **Backend**: Organized into routes, services, models, utils, and config
- **Frontend**: Component-based architecture with reusable UI components

## License

[Add your license here]
