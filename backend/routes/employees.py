"""Employee management routes."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, delete
import pandas as pd
from io import BytesIO
from backend.models import Employee, EmployeeCreate, EmployeeUpdate
from backend.database import get_session
from backend.auth import get_current_admin_employee
from backend.utils import to_snake_case

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
def get_employees(
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Returns all employees from database."""
    statement = select(Employee)
    employees = session.exec(statement).all()
    employee_list = [employee.model_dump() for employee in employees]
    return {
        "total": len(employee_list),
        "employees": employee_list
    }


@router.post("")
def create_employee(
    employee_data: EmployeeCreate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Creates a new employee record."""
    statement = select(Employee).where(Employee.employee_id == employee_data.employee_id)
    existing_employee = session.exec(statement).first()
    
    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail=f"Employee with employee_id '{employee_data.employee_id}' already exists"
        )
    
    employee = Employee(**employee_data.model_dump())
    session.add(employee)
    session.commit()
    session.refresh(employee)
    
    return {
        "message": "Employee created successfully",
        "employee": employee.model_dump()
    }


@router.get("/{employee_id}")
def get_employee(
    employee_id: str,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Returns employee by employee_id."""
    statement = select(Employee).where(Employee.employee_id == employee_id)
    employee = session.exec(statement).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee.model_dump()


@router.patch("/{employee_id}")
def update_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Updates employee record by employee_id (partial update)."""
    statement = select(Employee).where(Employee.employee_id == employee_id)
    employee = session.exec(statement).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = employee_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    session.add(employee)
    session.commit()
    session.refresh(employee)
    
    return {
        "message": "Employee updated successfully",
        "employee": employee.model_dump()
    }


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: str,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Deletes employee record by employee_id."""
    statement = select(Employee).where(Employee.employee_id == employee_id)
    employee = session.exec(statement).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    session.delete(employee)
    session.commit()
    
    return {
        "message": "Employee deleted successfully",
        "employee_id": employee_id
    }


@router.post("/upload")
async def upload_excel(
    file: UploadFile = File(..., description="Excel file with employee data"),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Uploads Excel file and stores employee records in database."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)"
        )
    
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        df.columns = [to_snake_case(col) for col in df.columns]
        
        expected_columns = [
            'employee_id',
            'employee_name',
            'reporting_manager_id',
            'reporting_manager_name',
            'vertical_head_id',
            'vertical_head_name',
            'vertical',
            'status',
            'exception'
        ]
        
        missing_columns = [col for col in expected_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        statement = delete(Employee)
        session.exec(statement)
        session.commit()
        
        records = df.to_dict(orient='records')
        
        employees = []
        for record in records:
            cleaned_record = {
                k: (v if pd.notna(v) else None) for k, v in record.items()
            }
            if 'employee_id' in cleaned_record and cleaned_record['employee_id'] is not None:
                cleaned_record['employee_id'] = str(cleaned_record['employee_id'])
            if 'employee_name' in cleaned_record and cleaned_record['employee_name'] is not None:
                cleaned_record['employee_name'] = str(cleaned_record['employee_name'])
            
            employee = Employee(**cleaned_record)
            employees.append(employee)
        
        session.add_all(employees)
        session.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Excel file uploaded successfully",
                "records_loaded": len(employees),
                "filename": file.filename
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Excel file: {str(e)}"
        )

