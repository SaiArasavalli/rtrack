"""Database models for the application."""

from __future__ import annotations

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date


class Employee(SQLModel, table=True):
    """Employee model with snake_case column names."""
    
    id: int | None = Field(default=None, primary_key=True)
    employee_id: str
    employee_name: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None


class EmployeeCreate(SQLModel):
    """Model for creating a new employee record."""
    
    employee_id: str
    employee_name: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None


class EmployeeUpdate(SQLModel):
    """Model for updating employee records (partial update)."""
    
    employee_name: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None


# Authentication Models
class LoginRequest(SQLModel):
    """Model for login request."""
    
    username: str  # Maps to employee_id
    password: str  # Currently not verified


class Token(SQLModel):
    """Model for JWT token response."""
    
    access_token: str
    token_type: str = "bearer"


class Attendance(SQLModel, table=True):
    """Attendance model for employee swipe records."""
    
    id: int | None = Field(default=None, primary_key=True)
    employee_id: str
    employee_name: str
    swipe_in: Optional[str] = None
    swipe_out: Optional[str] = None
    work_hours: Optional[str] = None  # HH:MM format string
    hours_worked: Optional[float] = None  # Decimal hours rounded to 2 places
    is_present: int = Field(default=0)  # 1 when hours_worked > 0, else 0
    date: date
    week_start: date
    week_end: date
    week_number: int
    month_number: int
    quarter_number: int
    year: int
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class WeeklyCompliance(SQLModel, table=True):
    """Weekly compliance model for employee compliance tracking."""
    
    id: int | None = Field(default=None, primary_key=True)
    employee_id: str
    employee_name: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None
    weekly_days: Optional[float] = None
    weekly_hours: Optional[float] = None
    week_number: int
    week_start: date
    week_end: date
    total_days_present: float = Field(default=0.0)
    total_hours_worked: float = Field(default=0.0)
    is_compliant: Optional[float] = None  # 1.0: Compliant, 0.0: Not Compliant, None: No Data
    compliance_status: str  # Values: "Compliant", "Not Compliant", "No Data"
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class MonthlyCompliance(SQLModel, table=True):
    """Monthly compliance model for employee compliance tracking."""
    
    id: int | None = Field(default=None, primary_key=True)
    employee_id: str
    employee_name: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None
    monthly_days: Optional[float] = None
    monthly_hours: Optional[float] = None
    month: int
    year: int
    month_start: date
    month_end: date
    total_days_present: float = Field(default=0.0)
    total_hours_worked: float = Field(default=0.0)
    is_compliant: Optional[int] = None  # 1: Compliant, 0: Not Compliant
    compliance_status: str  # Values: "Compliant", "Not Compliant"
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class QuarterlyCompliance(SQLModel, table=True):
    """Quarterly compliance model for employee compliance tracking."""
    
    id: int | None = Field(default=None, primary_key=True)
    employee_id: str
    employee_name: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    vertical_head_id: Optional[str] = None
    vertical_head_name: Optional[str] = None
    vertical: Optional[str] = None
    status: Optional[str] = None
    exception: Optional[str] = None
    quarterly_days: Optional[float] = None
    quarterly_hours: Optional[float] = None
    quarter: int
    year: int
    quarter_start: date
    quarter_end: date
    total_days_present: float = Field(default=0.0)
    total_hours_worked: float = Field(default=0.0)
    is_compliant: Optional[int] = None  # 1: Compliant, 0: Not Compliant
    compliance_status: str  # Values: "Compliant", "Not Compliant"
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class Exception(SQLModel, table=True):
    """Exception model for managing employee exceptions.
    
    Format: {period}_{number}_day
    - period: weekly, monthly, or quarterly
    - number: integer value
    Example: weekly_2_day, monthly_4_day, quarterly_6_day
    """
    
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)


class ExceptionCreate(SQLModel):
    """Model for creating a new exception.
    
    Format: {period}_{number}_day
    - period: weekly, monthly, or quarterly
    - number: integer value
    """
    
    name: str


class ExceptionUpdate(SQLModel):
    """Model for updating an exception."""
    
    name: Optional[str] = None
