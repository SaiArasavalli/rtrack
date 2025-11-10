"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlmodel import Session, select
from datetime import timedelta
from backend.models import Employee, LoginRequest, Token
from backend.database import get_session
from backend.auth import (
    create_access_token, get_current_employee,
    HARDCODED_ADMIN_USERNAME, HARDCODED_ADMIN_PASSWORD,
    HARDCODED_ADMIN_EMPLOYEE_ID, ACCESS_TOKEN_EXPIRE_MINUTES,
    is_admin
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    """
    Authenticates users and returns JWT token.
    Username maps to employee_id. Password verification is skipped for regular employees.
    Hardcoded admin account (admin/password) is always available.
    """
    if login_data.username == HARDCODED_ADMIN_USERNAME:
        if login_data.password == HARDCODED_ADMIN_PASSWORD:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": HARDCODED_ADMIN_EMPLOYEE_ID}, expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    statement = select(Employee).where(Employee.employee_id == login_data.username)
    employee = session.exec(statement).first()
    
    if not employee:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid employee_id",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": employee.employee_id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_current_user_info(
    current_employee: Employee = Depends(get_current_employee),
    session: Session = Depends(get_session)
):
    """Returns current authenticated user information."""
    if current_employee.employee_id == HARDCODED_ADMIN_EMPLOYEE_ID:
        return {
            "employee_id": HARDCODED_ADMIN_EMPLOYEE_ID,
            "employee_name": "System Admin",
            "is_admin": True,
            "has_reportees": True  # Admin always has reportees (all employees)
        }
    
    # Check if employee has reportees (employees reporting to them or in their vertical)
    reportee_statement = select(Employee.employee_id).where(
        (Employee.reporting_manager_id == current_employee.employee_id) |
        (Employee.vertical_head_id == current_employee.employee_id)
    )
    reportees = session.exec(reportee_statement).all()
    has_reportees = len(reportees) > 0
    
    return {
        "employee_id": current_employee.employee_id,
        "employee_name": current_employee.employee_name,
        "is_admin": is_admin(current_employee.employee_id),
        "has_reportees": has_reportees
    }

