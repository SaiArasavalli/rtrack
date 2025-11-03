"""Authentication and authorization utilities."""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from backend.database import get_session
from backend.models import Employee
from backend.config import (
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    HARDCODED_ADMIN_USERNAME, HARDCODED_ADMIN_PASSWORD, HARDCODED_ADMIN_EMPLOYEE_ID
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, credentials_exception: HTTPException) -> dict:
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        employee_id: str = payload.get("sub")
        if employee_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def is_admin(employee_id: str) -> bool:
    """Check if employee_id is admin."""
    return employee_id == HARDCODED_ADMIN_EMPLOYEE_ID


async def get_current_employee(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Employee:
    """Get the current authenticated employee."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(token, credentials_exception)
    employee_id: str = payload.get("sub")
    
    if employee_id is None:
        raise credentials_exception
    
    # Handle hardcoded admin account
    if employee_id == HARDCODED_ADMIN_EMPLOYEE_ID:
        return Employee(
            id=0,
            employee_id=HARDCODED_ADMIN_EMPLOYEE_ID,
            employee_name="System Admin",
            reporting_manager_id=None,
            reporting_manager_name=None,
            vertical_head_id=None,
            vertical_head_name=None,
            vertical=None,
            status="Active",
            exception=None
        )
    
    # Look up employee in database
    statement = select(Employee).where(Employee.employee_id == employee_id)
    employee = session.exec(statement).first()
    
    if employee is None:
        raise credentials_exception
    
    return employee


async def get_current_admin_employee(
    current_employee: Employee = Depends(get_current_employee)
) -> Employee:
    """Get the current employee and verify they are admin."""
    if not is_admin(current_employee.employee_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_employee

