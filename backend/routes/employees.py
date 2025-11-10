from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, delete, func
from typing import Optional
from sqlalchemy import or_
import pandas as pd
from io import BytesIO
from backend.models import Employee, EmployeeCreate, EmployeeUpdate
from backend.database import get_session
from backend.auth import get_current_admin_employee
from backend.utils import to_snake_case
from backend.config.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
def get_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: Optional[str] = None,
    vertical: Optional[str] = None,
    status: Optional[str] = None,
    exception: Optional[str] = None,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    statement = select(Employee)
    
    if search and search.strip():
        search_lower = search.strip().lower()
        statement = statement.where(
            or_(
                Employee.employee_id.ilike(f"%{search_lower}%"),
                Employee.employee_name.ilike(f"%{search_lower}%")
            )
        )
    
    if vertical and vertical != "All":
        statement = statement.where(Employee.vertical == vertical)
    
    if status and status != "All":
        statement = statement.where(Employee.status == status)
    
    if exception and exception != "All":
        if exception == "default":
            statement = statement.where(
                or_(
                    Employee.exception == None,
                    Employee.exception == ""
                )
            )
        else:
            statement = statement.where(Employee.exception == exception)
    
    count_statement = select(func.count(Employee.id))
    if search and search.strip():
        search_lower = search.strip().lower()
        count_statement = count_statement.where(
            or_(
                Employee.employee_id.ilike(f"%{search_lower}%"),
                Employee.employee_name.ilike(f"%{search_lower}%")
            )
        )
    if vertical and vertical != "All":
        count_statement = count_statement.where(Employee.vertical == vertical)
    if status and status != "All":
        count_statement = count_statement.where(Employee.status == status)
    if exception and exception != "All":
        if exception == "default":
            count_statement = count_statement.where(
                or_(
                    Employee.exception == None,
                    Employee.exception == ""
                )
            )
        else:
            count_statement = count_statement.where(Employee.exception == exception)
    
    total_count = session.exec(count_statement).one()
    
    offset = (page - 1) * page_size
    statement = statement.offset(offset).limit(page_size).order_by(Employee.id.desc())
    employees = session.exec(statement).all()
    
    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        "employees": [employee.model_dump() for employee in employees]
    }


@router.post("")
def create_employee(
    employee_data: EmployeeCreate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
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
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)"
        )
    
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        df.columns = [to_snake_case(col) for col in df.columns]
        
        expected_columns = [
            'employee_id', 'employee_name', 'reporting_manager_id',
            'reporting_manager_name', 'vertical_head_id', 'vertical_head_name',
            'vertical', 'status', 'exception'
        ]
        
        missing_columns = [col for col in expected_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        session.exec(delete(Employee))
        session.commit()
        
        employees = []
        for record in df.to_dict(orient='records'):
            cleaned_record = {k: (v if pd.notna(v) else None) for k, v in record.items()}
            if 'employee_id' in cleaned_record and cleaned_record['employee_id']:
                cleaned_record['employee_id'] = str(cleaned_record['employee_id'])
            if 'employee_name' in cleaned_record and cleaned_record['employee_name']:
                cleaned_record['employee_name'] = str(cleaned_record['employee_name'])
            employees.append(Employee(**cleaned_record))
        
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

