# Rtrack - Employee and Attendance Management System

A comprehensive employee and attendance management system with compliance tracking capabilities.

## Features

- **Employee Management**: Upload and manage employee data via Excel files
- **Attendance Tracking**: Upload attendance records and track employee presence
- **Compliance Tracking**: 
  - Weekly compliance (automatically calculated after attendance upload)
  - Monthly compliance (on-demand calculation)
  - Quarterly compliance (on-demand calculation)
- **Role-Based Access Control**: 
  - Admin users: Full access to all features
  - Regular employees: Access to own compliance and direct reportees
- **Pivot Table Views**: Easy-to-read compliance data organized by time periods

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
├── frontend/         # Next.js frontend application
├── requirements.txt  # Python dependencies
└── employees.db      # SQLite database
```

See [README_STRUCTURE.md](README_STRUCTURE.md) for detailed project structure.

## Installation

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Backend

Start the FastAPI server:
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend

Start the Next.js development server:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `password`

*Note: Change these credentials in production!*

## API Endpoints

### Authentication
- `POST /auth/token` - Login endpoint
- `GET /auth/me` - Get current user information

### Employees
- `POST /employees/upload` - Upload employee Excel file
- `GET /employees` - Get all employees (admin only)
- `POST /employees` - Create employee (admin only)
- `GET /employees/{employee_id}` - Get employee by ID (admin only)
- `PATCH /employees/{employee_id}` - Update employee (admin only)
- `DELETE /employees/{employee_id}` - Delete employee (admin only)

### Attendance
- `POST /attendance/upload` - Upload attendance Excel file (admin only)
- `GET /attendance` - Get attendance records (latest week shown)
- `DELETE /attendance/clean` - Delete all attendance records (admin only)

### Compliance
- `GET /compliance` - Get weekly compliance (pivot format)
- `POST /compliance/monthly/calculate` - Calculate monthly compliance (admin only)
- `GET /compliance/monthly` - Get monthly compliance (pivot format)
- `POST /compliance/quarterly/calculate` - Calculate quarterly compliance (admin only)
- `GET /compliance/quarterly` - Get quarterly compliance (pivot format)

### Database Management
- `DELETE /database/clean` - Delete all data except employees (admin only)

## Development

The project follows a modular architecture:

- **Backend**: Organized into routes, services, models, utils, and config
- **Frontend**: Component-based architecture with reusable UI components

See [README_STRUCTURE.md](README_STRUCTURE.md) for detailed architecture documentation.

## License

[Add your license here]
