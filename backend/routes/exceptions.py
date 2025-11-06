from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
import re
from datetime import datetime
from backend.models import Exception, ExceptionCreate, ExceptionUpdate, Employee
from backend.database import get_session
from backend.auth import get_current_admin_employee, get_current_employee

router = APIRouter(prefix="/exceptions", tags=["exceptions"])

EXCEPTION_PATTERN = re.compile(r'^(weekly|monthly|quarterly)_(\d+)_day$')
SPECIAL_EXCEPTIONS = {'default', 'other'}
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def validate_exception_format(name: str) -> bool:
    name_lower = name.lower()
    if name_lower in SPECIAL_EXCEPTIONS:
        return True
    return bool(EXCEPTION_PATTERN.match(name))


@router.get("")
def get_exceptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    offset = (page - 1) * page_size
    total_count = session.exec(select(func.count(Exception.id))).one()
    statement = select(Exception).order_by(Exception.name.asc()).offset(offset).limit(page_size)
    exceptions = session.exec(statement).all()
    return {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
        "exceptions": [exc.model_dump() for exc in exceptions]
    }


@router.post("")
def create_exception(
    exception_data: ExceptionCreate,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    exception_name = exception_data.name.lower() if exception_data.name.lower() in SPECIAL_EXCEPTIONS else exception_data.name
    
    if not validate_exception_format(exception_name):
        raise HTTPException(
            status_code=400,
            detail=f"Exception name must follow format: {{period}}_{{number}}_day (e.g., weekly_2_day, monthly_4_day, quarterly_6_day) or be 'default' or 'other'"
        )
    
    exception_data.name = exception_name
    
    existing_exception = session.exec(select(Exception).where(Exception.name == exception_data.name)).first()
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
    exception = session.exec(select(Exception).where(Exception.id == exception_id)).first()
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
    exception = session.exec(select(Exception).where(Exception.id == exception_id)).first()
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    if exception_data.name and exception_data.name != exception.name:
        new_name = exception_data.name.lower() if exception_data.name.lower() in SPECIAL_EXCEPTIONS else exception_data.name
        
        if not validate_exception_format(new_name):
            raise HTTPException(
                status_code=400,
                detail=f"Exception name must follow format: {{period}}_{{number}}_day (e.g., weekly_2_day, monthly_4_day, quarterly_6_day) or be 'default' or 'other'"
            )
        
        exception_data.name = new_name
        existing_exception = session.exec(select(Exception).where(Exception.name == exception_data.name)).first()
        if existing_exception:
            raise HTTPException(
                status_code=400,
                detail=f"Exception with name '{exception_data.name}' already exists"
            )
    
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
    exception = session.exec(select(Exception).where(Exception.id == exception_id)).first()
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    employees_using = session.exec(select(Employee).where(Employee.exception == exception.name)).all()
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
    employees = session.exec(select(Employee).where(Employee.exception.isnot(None))).all()
    unique_exceptions = {emp.exception.strip() for emp in employees if emp.exception and emp.exception.strip()}
    
    created_count = 0
    skipped_count = 0
    
    for exc_name in unique_exceptions:
        normalized_name = exc_name.lower() if exc_name.lower() in SPECIAL_EXCEPTIONS else exc_name
        
        if session.exec(select(Exception).where(Exception.name == normalized_name)).first():
            skipped_count += 1
            continue
        
        if validate_exception_format(normalized_name):
            session.add(Exception(name=normalized_name))
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

