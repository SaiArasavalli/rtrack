"""Exception management routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from backend.models import Exception, ExceptionCreate, ExceptionUpdate, Employee
from backend.database import get_session
from backend.auth import get_current_admin_employee
from datetime import datetime
import re

router = APIRouter(prefix="/exceptions", tags=["exceptions"])

# Exception format validation: {period}_{number}_day, "default", or "other"
EXCEPTION_PATTERN = re.compile(r'^(weekly|monthly|quarterly)_(\d+)_day$')
SPECIAL_EXCEPTIONS = {'default', 'other'}


def validate_exception_format(name: str) -> bool:
    """Validate exception name follows the format {period}_{number}_day, or is 'default' or 'other'"""
    name_lower = name.lower()
    if name_lower in SPECIAL_EXCEPTIONS:
        return True
    return bool(EXCEPTION_PATTERN.match(name))


@router.get("")
def get_exceptions(
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Returns all exceptions from database."""
    statement = select(Exception).order_by(Exception.name.asc())
    exceptions = session.exec(statement).all()
    exception_list = [exception.model_dump() for exception in exceptions]
    return {
        "total": len(exception_list),
        "exceptions": exception_list
    }


@router.post("")
def create_exception(
    exception_data: ExceptionCreate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Creates a new exception record.
    
    Exception name must follow format: {period}_{number}_day, or be 'default' or 'other'
    - period: weekly, monthly, or quarterly
    - number: integer value
    Example: weekly_2_day, monthly_4_day, quarterly_6_day, default, other
    """
    # Normalize to lowercase for special exceptions
    exception_name = exception_data.name.lower() if exception_data.name.lower() in SPECIAL_EXCEPTIONS else exception_data.name
    
    # Validate format
    if not validate_exception_format(exception_name):
        raise HTTPException(
            status_code=400,
            detail=f"Exception name must follow format: {{period}}_{{number}}_day (e.g., weekly_2_day, monthly_4_day, quarterly_6_day) or be 'default' or 'other'"
        )
    
    # Use normalized name
    exception_data.name = exception_name
    
    # Check if exception with same name already exists
    statement = select(Exception).where(Exception.name == exception_data.name)
    existing_exception = session.exec(statement).first()
    
    if existing_exception:
        raise HTTPException(
            status_code=400,
            detail=f"Exception with name '{exception_data.name}' already exists"
        )
    
    exception = Exception(**exception_data.model_dump())
    session.add(exception)
    session.commit()
    session.refresh(exception)
    
    return exception.model_dump()


@router.get("/{exception_id}")
def get_exception(
    exception_id: int,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Returns a specific exception by ID."""
    statement = select(Exception).where(Exception.id == exception_id)
    exception = session.exec(statement).first()
    
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    return exception.model_dump()


@router.put("/{exception_id}")
def update_exception(
    exception_id: int,
    exception_data: ExceptionUpdate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Updates an existing exception."""
    statement = select(Exception).where(Exception.id == exception_id)
    exception = session.exec(statement).first()
    
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Check if new name conflicts with existing exception
    if exception_data.name and exception_data.name != exception.name:
        # Normalize to lowercase for special exceptions
        new_name = exception_data.name.lower() if exception_data.name.lower() in SPECIAL_EXCEPTIONS else exception_data.name
        
        # Validate format
        if not validate_exception_format(new_name):
            raise HTTPException(
                status_code=400,
                detail=f"Exception name must follow format: {{period}}_{{number}}_day (e.g., weekly_2_day, monthly_4_day, quarterly_6_day) or be 'default' or 'other'"
            )
        
        # Use normalized name
        exception_data.name = new_name
        
        existing_statement = select(Exception).where(Exception.name == exception_data.name)
        existing_exception = session.exec(existing_statement).first()
        if existing_exception:
            raise HTTPException(
                status_code=400,
                detail=f"Exception with name '{exception_data.name}' already exists"
            )
    
    # Update fields
    update_data = exception_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exception, field, value)
    
    exception.updated_at = datetime.utcnow()
    session.add(exception)
    session.commit()
    session.refresh(exception)
    
    return exception.model_dump()


@router.delete("/{exception_id}")
def delete_exception(
    exception_id: int,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Deletes an exception record."""
    statement = select(Exception).where(Exception.id == exception_id)
    exception = session.exec(statement).first()
    
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    # Check if any employees are using this exception
    from backend.models import Employee as EmpModel
    employee_statement = select(EmpModel).where(EmpModel.exception == exception.name)
    employees_using = session.exec(employee_statement).all()
    
    if employees_using:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete exception. {len(employees_using)} employee(s) are currently using it."
        )
    
    session.delete(exception)
    session.commit()
    
    return {"message": "Exception deleted successfully"}


@router.post("/populate")
def populate_exceptions(
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Populates exceptions table from existing employee records."""
    # Get all unique exception values from employees
    statement = select(Employee).where(Employee.exception.isnot(None))
    employees = session.exec(statement).all()
    
    unique_exceptions = set()
    for emp in employees:
        if emp.exception and emp.exception.strip():
            unique_exceptions.add(emp.exception.strip())
    
    created_count = 0
    skipped_count = 0
    
    for exc_name in unique_exceptions:
        # Normalize special exceptions to lowercase
        normalized_name = exc_name.lower() if exc_name.lower() in SPECIAL_EXCEPTIONS else exc_name
        
        # Skip if already exists (check both original and normalized)
        existing = session.exec(select(Exception).where(Exception.name == normalized_name)).first()
        if existing:
            skipped_count += 1
            continue
        
        # Validate format before creating
        if validate_exception_format(normalized_name):
            exception = Exception(name=normalized_name)
            session.add(exception)
            created_count += 1
        else:
            skipped_count += 1
    
    session.commit()
    
    return {
        "message": f"Populated exceptions from employee records",
        "created": created_count,
        "skipped": skipped_count,
        "total_found": len(unique_exceptions)
    }

