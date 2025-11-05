# rTrack Setup Guide

Complete step-by-step guide to set up and run rTrack on your local machine.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Python 3.8 or higher installed
- [ ] Node.js 18 or higher installed
- [ ] npm (comes with Node.js)
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

### Verify Prerequisites

```bash
# Check Python version
python --version  # or python3 --version
# Should show Python 3.8+

# Check Node.js version
node --version
# Should show v18+

# Check npm version
npm --version
# Should show 9+

# Check Git
git --version
```

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd rtrack
```

### Step 2: Backend Setup

#### 2.1 Create Virtual Environment

**For macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**For Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

#### 2.2 Install Backend Dependencies

```bash
# Make sure you're in the project root directory
pip install -r requirements.txt
```

This will install all required Python packages including FastAPI, SQLModel, Pandas, etc.

#### 2.3 Verify Backend Setup

```bash
cd backend
python -c "import fastapi; print('FastAPI installed successfully')"
```

If you see "FastAPI installed successfully", the backend setup is complete.

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
# From project root
cd frontend
```

#### 3.2 Install Frontend Dependencies

```bash
npm install
```

This will install all required Node.js packages including Next.js, React, TypeScript, etc.

**Note:** This may take a few minutes depending on your internet connection.

#### 3.3 Verify Frontend Setup

```bash
npm list next
```

If you see Next.js in the output, the frontend setup is complete.

### Step 4: Configure Environment (Optional)

#### Backend Configuration

Create a `.env` file in the `backend` directory (optional):

```bash
cd backend
touch .env  # macOS/Linux
# or
type nul > .env  # Windows
```

Add the following content (modify as needed):

```env
SECRET_KEY=your-secret-key-change-this-in-production
DATABASE_URL=sqlite:///./employees.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
DEBUG=False
```

#### Frontend Configuration

Create a `.env.local` file in the `frontend` directory (optional):

```bash
cd frontend
touch .env.local  # macOS/Linux
# or
type nul > .env.local  # Windows
```

Add the following if your backend runs on a different port:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 5: Start the Application

#### 5.1 Start Backend Server

Open a terminal window and run:

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Navigate to backend directory
cd backend

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see output similar to:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Backend is now running at:**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### 5.2 Start Frontend Server

Open a **new** terminal window and run:

```bash
# Navigate to frontend directory
cd frontend

# Start the development server
npm run dev
```

You should see output similar to:
```
  ▲ Next.js 16.0.1
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

**Frontend is now running at:** http://localhost:3000

### Step 6: Access the Application

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. You'll be redirected to the login page
4. Use the default credentials:
   - **Username:** `admin`
   - **Password:** `password`

## Quick Start Commands

For experienced users, here's a quick reference:

```bash
# Terminal 1: Backend
cd rtrack
source venv/bin/activate  # or venv\Scripts\activate on Windows
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd rtrack/frontend
npm run dev
```

## Verifying the Setup

### Test Backend

1. Open http://localhost:8000/docs in your browser
2. You should see the FastAPI interactive documentation
3. Try the `/health` endpoint to verify the server is running

### Test Frontend

1. Open http://localhost:3000 in your browser
2. You should see the login page
3. Log in with `admin` / `password`
4. You should be redirected to the dashboard

## First-Time Setup

After logging in for the first time:

1. **Upload Employees**: Go to the Upload page and upload an employee Excel file
2. **Upload Attendance**: Go to Attendance page and upload attendance data
3. **View Compliance**: Check the Compliance page to see weekly compliance
4. **Create Exceptions**: Go to Exceptions page and create exceptions or populate from employees

## Troubleshooting

### Backend Issues

**Problem: `uvicorn: command not found`**
```bash
# Solution: Make sure virtual environment is activated and dependencies are installed
source venv/bin/activate
pip install -r requirements.txt
```

**Problem: `Port 8000 already in use`**
```bash
# Solution: Use a different port
uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Then update frontend .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8001
```

**Problem: Database errors**
```bash
# Solution: Delete the database file and restart
rm backend/employees.db  # macOS/Linux
# or
del backend\employees.db  # Windows
# Then restart the backend server
```

### Frontend Issues

**Problem: `npm install` fails**
```bash
# Solution: Clear npm cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json  # macOS/Linux
# or
rmdir /s node_modules package-lock.json  # Windows
npm install
```

**Problem: `Port 3000 already in use`**
```bash
# Solution: Use a different port
npm run dev -- -p 3001
```

**Problem: Cannot connect to backend**
- Verify backend is running on http://localhost:8000
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches backend URL

### Common Errors

**Error: Module not found**
- Make sure you're in the correct directory
- Reinstall dependencies: `pip install -r requirements.txt` or `npm install`

**Error: Authentication failed**
- Verify you're using correct credentials (admin/password)
- Check backend logs for authentication errors
- Ensure backend is running

**Error: Database locked**
- Stop all running instances of the backend
- Delete `employees.db` and restart

## Development Tips

1. **Hot Reload**: Both backend and frontend support hot reload. Changes will automatically refresh.

2. **API Testing**: Use the interactive docs at http://localhost:8000/docs to test API endpoints.

3. **Database**: The SQLite database (`employees.db`) is created automatically in the `backend` directory.

4. **Logs**: Check terminal output for both backend and frontend logs.

5. **Browser DevTools**: Use browser DevTools (F12) to debug frontend issues.

## Production Deployment

For production deployment:

1. Set `DEBUG=False` in backend `.env`
2. Change default admin credentials
3. Use a strong `SECRET_KEY`
4. Build frontend: `cd frontend && npm run build`
5. Use a production WSGI server (e.g., Gunicorn) for backend
6. Configure proper CORS origins
7. Use a production database (PostgreSQL recommended)

## Support

If you encounter issues not covered in this guide:

1. Check the terminal logs for error messages
2. Verify all prerequisites are installed correctly
3. Ensure all ports are available
4. Review the main README.md for additional information

## Next Steps

Once setup is complete:

- [ ] Upload employee data
- [ ] Upload attendance records
- [ ] View compliance reports
- [ ] Create and manage exceptions
- [ ] Explore the API documentation at /docs

Happy coding! 🚀

