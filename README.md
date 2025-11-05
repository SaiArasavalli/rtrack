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
├── frontend/         # Next.js frontend application
├── requirements.txt  # Python dependencies
└── employees.db      # SQLite database
```

See [README_STRUCTURE.md](README_STRUCTURE.md) for detailed project structure.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** and **npm** - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/downloads)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd rtrack
```

### Step 2: Backend Setup

#### 2.1 Create Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

#### 2.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 2.3 (Optional) Configure Environment Variables

Create a `.env` file in the `backend` directory (optional - defaults are provided):

```bash
cd backend
touch .env  # On Windows: type nul > .env
```

Add the following to `.env` (optional):
```env
SECRET_KEY=your-secret-key-change-this-in-production
DATABASE_URL=sqlite:///./employees.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
DEBUG=False
```

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd frontend
```

#### 3.2 Install Node Dependencies

```bash
npm install
```

#### 3.3 (Optional) Configure Environment Variables

Create a `.env.local` file in the `frontend` directory (optional):

```bash
touch .env.local  # On Windows: type nul > .env.local
```

Add the following if your backend runs on a different port:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Step 4: Start the Backend Server

Open a terminal window and run:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:**
- API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Interactive API Docs: `http://localhost:8000/redoc`

### Step 5: Start the Frontend Server

Open a **new** terminal window and run:

```bash
cd frontend
npm run dev
```

**Frontend will be available at:**
- Web Application: `http://localhost:3000`

### Step 6: Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Use the default admin credentials to log in:
   - **Username**: `admin`
   - **Password**: `password`

## Quick Start Summary

For quick reference, here's the complete setup process:

```bash
# 1. Clone repository
git clone <repository-url>
cd rtrack

# 2. Backend setup
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Frontend setup
cd frontend
npm install

# 4. Start backend (in one terminal)
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. Start frontend (in another terminal)
cd frontend
npm run dev

# 6. Open browser and go to http://localhost:3000
```

## Default Admin Credentials

- **Username**: `admin`
- **Password**: `password`

*Note: Change these credentials in production!*

## Troubleshooting

### Common Issues

**Issue: Backend won't start**
- Ensure Python 3.8+ is installed: `python --version`
- Make sure virtual environment is activated
- Check if port 8000 is already in use

**Issue: Frontend won't start**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Check if port 3000 is already in use

**Issue: Cannot connect to backend from frontend**
- Verify backend is running on `http://localhost:8000`
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local` matches backend URL
- Ensure CORS is properly configured in backend settings

**Issue: Database not found**
- The database (`employees.db`) will be created automatically on first run
- If you encounter database errors, delete `employees.db` and restart the backend

**Issue: Login fails**
- Verify you're using the correct credentials (default: admin/password)
- Check backend logs for authentication errors
- Ensure backend is running and accessible

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
- `GET /attendance/last-upload` - Get last upload information (admin only)

### Compliance
- `GET /compliance` - Get weekly compliance (pivot format)
- `POST /compliance/monthly/calculate` - Calculate monthly compliance (admin only)
- `GET /compliance/monthly` - Get monthly compliance (pivot format)
- `POST /compliance/quarterly/calculate` - Calculate quarterly compliance (admin only)
- `GET /compliance/quarterly` - Get quarterly compliance (pivot format)

### Exceptions
- `GET /exceptions` - Get all exceptions (admin only)
- `POST /exceptions` - Create exception (admin only)
- `GET /exceptions/{id}` - Get exception by ID (admin only)
- `PUT /exceptions/{id}` - Update exception (admin only)
- `DELETE /exceptions/{id}` - Delete exception (admin only)
- `POST /exceptions/populate` - Populate exceptions from employee records (admin only)

### Database Management
- `DELETE /database/clean` - Delete all data except employees (admin only)

## Development

The project follows a modular architecture:

- **Backend**: Organized into routes, services, models, utils, and config
- **Frontend**: Component-based architecture with reusable UI components

See [README_STRUCTURE.md](README_STRUCTURE.md) for detailed architecture documentation.

## License

[Add your license here]
