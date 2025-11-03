# Employee Portal Frontend

A beautiful, modern frontend built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui components to manage the Employee Management API.

## Features

- 🎨 Beautiful, polished UI with Tailwind CSS and shadcn/ui
- 🔐 Authentication with JWT tokens
- 👥 Employee management (CRUD operations)
- 📤 Excel file upload
- 📱 Responsive design
- 🌙 Dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- FastAPI backend running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file (copy from `.env.local.example`):
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` if your API is running on a different URL:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## Usage

1. **Login**: Navigate to `/login` and sign in with your employee ID (username) and password
2. **View Employees**: See all employees in a beautiful table view
3. **Create Employee**: Click "Add Employee" to create a new employee record
4. **Edit Employee**: Click the edit icon on any employee row
5. **Delete Employee**: Click the delete icon on any employee row
6. **Upload Excel**: Navigate to `/upload` to upload an Excel file with employee data

## Admin Access

- Only employees with ID `GCC5301` have admin access
- Admin can perform all operations (create, update, delete, upload)
- Other employees will see "Unauthorized" errors for admin operations

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **lucide-react** - Icons
- **Sonner** - Toast notifications
