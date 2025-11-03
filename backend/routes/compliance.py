"""Compliance routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete
from typing import Optional
from datetime import date
from sqlalchemy import and_
import traceback
from backend.models import (
    Employee, Attendance, WeeklyCompliance,
    MonthlyCompliance, QuarterlyCompliance
)
from backend.database import get_session
from backend.auth import get_current_employee, get_current_admin_employee, is_admin
from backend.services.compliance_service import (
    calculate_weekly_compliance,
    calculate_monthly_compliance,
    calculate_quarterly_compliance
)

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("")
async def get_compliance(
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns weekly compliance records organized by week for pivot table."""
    statement = select(WeeklyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_statement).all()
        allowed_employee_ids = [current_employee.employee_id] + list(reportees)
        if allowed_employee_ids:
            statement = statement.where(WeeklyCompliance.employee_id.in_(allowed_employee_ids))
    
    if year:
        statement = statement.where(WeeklyCompliance.week_start >= f"{year}-01-01")
        statement = statement.where(WeeklyCompliance.week_start < f"{year+1}-01-01")
    
    if month and year:
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        statement = statement.where(
            and_(
                WeeklyCompliance.week_start < month_end,
                WeeklyCompliance.week_end >= month_start
            )
        )
    
    if status and status.lower() != "all":
        statement = statement.where(WeeklyCompliance.status == status)
    
    statement = statement.order_by(WeeklyCompliance.week_start.asc(), WeeklyCompliance.employee_id.asc())
    compliance_records = session.exec(statement).all()
    
    employees_dict = {}
    weeks_dict = {}
    
    for record in compliance_records:
        emp_id = record.employee_id
        
        week_start_str = record.week_start.strftime("%b %d")
        week_end_str = record.week_end.strftime("%b %d")
        week_label = f"Week {record.week_number} ({week_start_str} → {week_end_str})"
        week_key_str = f"{record.week_start.isoformat()}_{record.week_end.isoformat()}_{record.week_number}"
        week_key_tuple = (record.week_start, record.week_end, record.week_number)
        
        if week_key_tuple not in weeks_dict:
            weeks_dict[week_key_tuple] = {
                "label": week_label,
                "week_number": record.week_number,
                "week_start": record.week_start.isoformat(),
                "week_end": record.week_end.isoformat(),
                "key_str": week_key_str,
            }
        
        if emp_id not in employees_dict:
            employees_dict[emp_id] = {
                "employee_id": record.employee_id,
                "employee_name": record.employee_name,
                "reporting_manager_id": record.reporting_manager_id,
                "reporting_manager_name": record.reporting_manager_name,
                "vertical_head_id": record.vertical_head_id,
                "vertical_head_name": record.vertical_head_name,
                "vertical": record.vertical,
                "status": record.status,
                "exception": record.exception,
                "weeks": {}
            }
        
        employees_dict[emp_id]["weeks"][week_key_str] = {
            "compliance_status": record.compliance_status,
            "total_days_present": record.total_days_present,
            "total_hours_worked": record.total_hours_worked,
            "weekly_days": record.weekly_days or 5.0,
            "weekly_hours": record.weekly_hours or 40.0,
        }
    
    sorted_weeks = sorted(weeks_dict.items(), key=lambda x: x[0][0])
    
    current_employee_data = None
    reportees_data = []
    
    if not is_admin(current_employee.employee_id):
        current_employee_data = employees_dict.get(current_employee.employee_id)
        for emp_id, emp_data in employees_dict.items():
            if emp_id != current_employee.employee_id:
                reportees_data.append(emp_data)
    else:
        reportees_data = list(employees_dict.values())
    
    unique_employee_count = len(employees_dict)
    
    result = {
        "total": unique_employee_count,
        "employees": list(employees_dict.values()),
        "weeks": [{"key_str": v["key_str"], **{k: v for k, v in v.items() if k != "key_str"}} for _, v in sorted_weeks],
    }
    
    if not is_admin(current_employee.employee_id):
        result["current_employee"] = current_employee_data
        result["reportees"] = reportees_data
    
    return result


@router.post("/monthly/calculate")
async def calculate_monthly_compliance_endpoint(
    year: int,
    month: int,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Calculates monthly compliance for specified year and month."""
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=400,
            detail="Month must be between 1 and 12"
        )
    
    try:
        compliance_records = calculate_monthly_compliance(session, year, month)
        compliant_count = sum(1 for r in compliance_records if r.is_compliant == 1)
        total_count = len(compliance_records)
        
        return {
            "message": f"Monthly compliance calculated for {year}-{month:02d}",
            "records_calculated": total_count,
            "compliant_count": compliant_count,
            "non_compliant_count": total_count - compliant_count
        }
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"ERROR in monthly compliance calculation: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating monthly compliance: {str(e)}"
        )


@router.post("/quarterly/calculate")
async def calculate_quarterly_compliance_endpoint(
    year: int,
    quarter: int,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Calculates quarterly compliance for specified year and quarter."""
    if quarter < 1 or quarter > 4:
        raise HTTPException(
            status_code=400,
            detail="Quarter must be between 1 and 4"
        )
    
    try:
        compliance_records = calculate_quarterly_compliance(session, year, quarter)
        compliant_count = sum(1 for r in compliance_records if r.is_compliant == 1)
        total_count = len(compliance_records)
        
        return {
            "message": f"Quarterly compliance calculated for Q{quarter} {year}",
            "records_calculated": total_count,
            "compliant_count": compliant_count,
            "non_compliant_count": total_count - compliant_count
        }
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"ERROR in quarterly compliance calculation: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating quarterly compliance: {str(e)}"
        )


@router.get("/monthly")
async def get_monthly_compliance(
    year: Optional[int] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns monthly compliance records organized by month for pivot table."""
    statement = select(MonthlyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_statement).all()
        allowed_employee_ids = [current_employee.employee_id] + list(reportees)
        if allowed_employee_ids:
            statement = statement.where(MonthlyCompliance.employee_id.in_(allowed_employee_ids))
    
    if year:
        statement = statement.where(MonthlyCompliance.year == year)
    
    if status and status.lower() != "all":
        statement = statement.where(MonthlyCompliance.status == status)
    
    statement = statement.order_by(MonthlyCompliance.month.asc(), MonthlyCompliance.employee_id.asc())
    compliance_records = session.exec(statement).all()
    
    employees_dict = {}
    months_dict = {}
    
    month_names = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    for record in compliance_records:
        emp_id = record.employee_id
        
        month_label = f"{month_names[record.month - 1]} {record.year}"
        month_key = f"{record.year}_{record.month}"
        
        if month_key not in months_dict:
            months_dict[month_key] = {
                "label": month_label,
                "month": record.month,
                "year": record.year,
                "month_start": record.month_start.isoformat(),
                "month_end": record.month_end.isoformat(),
            }
        
        if emp_id not in employees_dict:
            employees_dict[emp_id] = {
                "employee_id": record.employee_id,
                "employee_name": record.employee_name,
                "reporting_manager_id": record.reporting_manager_id,
                "reporting_manager_name": record.reporting_manager_name,
                "vertical_head_id": record.vertical_head_id,
                "vertical_head_name": record.vertical_head_name,
                "vertical": record.vertical,
                "status": record.status,
                "exception": record.exception,
                "months": {}
            }
        
        employees_dict[emp_id]["months"][month_key] = {
            "compliance_status": record.compliance_status,
            "total_days_present": record.total_days_present,
            "total_hours_worked": record.total_hours_worked,
            "monthly_days": record.monthly_days or 8.0,
            "monthly_hours": record.monthly_hours or 62.0,
        }
    
    sorted_months = sorted(months_dict.items(), key=lambda x: (x[1]["year"], x[1]["month"]))
    
    current_employee_data = None
    reportees_data = []
    
    if not is_admin(current_employee.employee_id):
        current_employee_data = employees_dict.get(current_employee.employee_id)
        for emp_id, emp_data in employees_dict.items():
            if emp_id != current_employee.employee_id:
                reportees_data.append(emp_data)
    else:
        reportees_data = list(employees_dict.values())
    
    unique_employee_count = len(employees_dict)
    
    result = {
        "total": unique_employee_count,
        "employees": list(employees_dict.values()),
        "months": [{"key": k, **v} for k, v in sorted_months],
    }
    
    if not is_admin(current_employee.employee_id):
        result["current_employee"] = current_employee_data
        result["reportees"] = reportees_data
    
    return result


@router.get("/quarterly")
async def get_quarterly_compliance(
    year: Optional[int] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns quarterly compliance records organized by quarter for pivot table."""
    statement = select(QuarterlyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_statement).all()
        allowed_employee_ids = [current_employee.employee_id] + list(reportees)
        if allowed_employee_ids:
            statement = statement.where(QuarterlyCompliance.employee_id.in_(allowed_employee_ids))
    
    if year:
        statement = statement.where(QuarterlyCompliance.year == year)
    
    if status and status.lower() != "all":
        statement = statement.where(QuarterlyCompliance.status == status)
    
    statement = statement.order_by(QuarterlyCompliance.quarter.asc(), QuarterlyCompliance.employee_id.asc())
    compliance_records = session.exec(statement).all()
    
    employees_dict = {}
    quarters_dict = {}
    
    for record in compliance_records:
        emp_id = record.employee_id
        
        quarter_label = f"Q{record.quarter} {record.year}"
        quarter_key = f"{record.year}_Q{record.quarter}"
        
        if quarter_key not in quarters_dict:
            quarters_dict[quarter_key] = {
                "label": quarter_label,
                "quarter": record.quarter,
                "year": record.year,
                "quarter_start": record.quarter_start.isoformat(),
                "quarter_end": record.quarter_end.isoformat(),
            }
        
        if emp_id not in employees_dict:
            employees_dict[emp_id] = {
                "employee_id": record.employee_id,
                "employee_name": record.employee_name,
                "reporting_manager_id": record.reporting_manager_id,
                "reporting_manager_name": record.reporting_manager_name,
                "vertical_head_id": record.vertical_head_id,
                "vertical_head_name": record.vertical_head_name,
                "vertical": record.vertical,
                "status": record.status,
                "exception": record.exception,
                "quarters": {}
            }
        
        employees_dict[emp_id]["quarters"][quarter_key] = {
            "compliance_status": record.compliance_status,
            "total_days_present": record.total_days_present,
            "total_hours_worked": record.total_hours_worked,
            "quarterly_days": record.quarterly_days or 24.0,
            "quarterly_hours": record.quarterly_hours or 186.0,
        }
    
    sorted_quarters = sorted(quarters_dict.items(), key=lambda x: (x[1]["year"], x[1]["quarter"]))
    
    current_employee_data = None
    reportees_data = []
    
    if not is_admin(current_employee.employee_id):
        current_employee_data = employees_dict.get(current_employee.employee_id)
        for emp_id, emp_data in employees_dict.items():
            if emp_id != current_employee.employee_id:
                reportees_data.append(emp_data)
    else:
        reportees_data = list(employees_dict.values())
    
    unique_employee_count = len(employees_dict)
    
    result = {
        "total": unique_employee_count,
        "employees": list(employees_dict.values()),
        "quarters": [{"key": k, **v} for k, v in sorted_quarters],
    }
    
    if not is_admin(current_employee.employee_id):
        result["current_employee"] = current_employee_data
        result["reportees"] = reportees_data
    
    return result


@router.delete("/database/clean")
async def clean_database(
    table_name: Optional[str] = None,
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """
    Deletes data from specified table or all tables (except Employee).
    
    Args:
        table_name: Optional table name to clean. If not provided, cleans all tables except Employee.
                   Valid values: 'attendance', 'weekly_compliance', 'monthly_compliance', 'quarterly_compliance'
    """
    # Map table names to their model classes
    table_map = {
        "attendance": Attendance,
        "weekly_compliance": WeeklyCompliance,
        "monthly_compliance": MonthlyCompliance,
        "quarterly_compliance": QuarterlyCompliance,
    }
    
    # Prevent Employee table deletion
    if table_name and table_name.lower() == "employee":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete Employee table. Employee records must be preserved for authentication."
        )
    
    deleted_counts = {}
    
    if table_name:
        # Clean specific table
        table_name_lower = table_name.lower()
        if table_name_lower not in table_map:
            valid_tables = ", ".join(table_map.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid table name '{table_name}'. Valid options: {valid_tables}"
            )
        
        model = table_map[table_name_lower]
        statement = delete(model)
        session.exec(statement)
        deleted_counts[table_name_lower] = "all"
        
        message = f"Data from '{table_name_lower}' table has been deleted."
    else:
        # Clean all tables except Employee
        quarterly_statement = delete(QuarterlyCompliance)
        session.exec(quarterly_statement)
        deleted_counts["quarterly_compliance"] = "all"
        
        monthly_statement = delete(MonthlyCompliance)
        session.exec(monthly_statement)
        deleted_counts["monthly_compliance"] = "all"
        
        compliance_statement = delete(WeeklyCompliance)
        session.exec(compliance_statement)
        deleted_counts["weekly_compliance"] = "all"
        
        attendance_statement = delete(Attendance)
        session.exec(attendance_statement)
        deleted_counts["attendance"] = "all"
        
        message = "All data from attendance and compliance tables has been deleted. Employee records preserved."
    
    session.commit()
    
    return {
        "message": message,
        "deleted_counts": deleted_counts,
        "note": "Employee records were preserved to maintain authentication capability" if not table_name else None
    }

