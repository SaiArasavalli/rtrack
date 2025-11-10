from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, delete
from typing import Optional
from datetime import date
from sqlalchemy import and_, or_
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
from backend.config.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("")
async def get_compliance(
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    exception: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    # Helper function to build employee data dict
    def build_employee_dict(records):
        employees_dict = {}
        weeks_dict = {}
        
        for record in records:
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
        return employees_dict, [{"key_str": v["key_str"], **{k: v for k, v in v.items() if k != "key_str"}} for _, v in sorted_weeks]
    
    # For non-admin users, fetch current_employee data separately (without search/filters/pagination)
    current_employee_data = None
    current_employee_records = []
    current_employee_weeks = []
    
    if not is_admin(current_employee.employee_id):
        # Fetch current employee's data separately (no search/filters/pagination)
        current_emp_statement = select(WeeklyCompliance).where(
            WeeklyCompliance.employee_id == current_employee.employee_id
        )
        
        if year:
            year_start = date(year, 1, 1)
            year_end = date(year + 1, 1, 1)
            current_emp_statement = current_emp_statement.where(WeeklyCompliance.week_start >= year_start)
            current_emp_statement = current_emp_statement.where(WeeklyCompliance.week_start < year_end)
        
        if month and year:
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, month + 1, 1)
            current_emp_statement = current_emp_statement.where(
                and_(
                    WeeklyCompliance.week_start < month_end,
                    WeeklyCompliance.week_end >= month_start
                )
            )
        
        current_employee_records = session.exec(current_emp_statement).all()
        if current_employee_records:
            current_emp_dict, current_employee_weeks = build_employee_dict(current_employee_records)
            current_employee_data = current_emp_dict.get(current_employee.employee_id)
    
    # Fetch reportees data with search/filters/pagination
    reportee_statement = select(WeeklyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_ids_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_ids_statement).all()
        reportee_ids = list(reportees)
        if reportee_ids:
            reportee_statement = reportee_statement.where(WeeklyCompliance.employee_id.in_(reportee_ids))
        else:
            # No reportees, return current employee data only
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "employees": [],
                "weeks": current_employee_weeks,
                "current_employee": current_employee_data,
                "reportees": []
            }
    
    # Apply date filters
    if year:
        year_start = date(year, 1, 1)
        year_end = date(year + 1, 1, 1)
        reportee_statement = reportee_statement.where(WeeklyCompliance.week_start >= year_start)
        reportee_statement = reportee_statement.where(WeeklyCompliance.week_start < year_end)
    
    if month and year:
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        reportee_statement = reportee_statement.where(
            and_(
                WeeklyCompliance.week_start < month_end,
                WeeklyCompliance.week_end >= month_start
            )
        )
    
    # Apply status filter
    if status and status.lower() != "all":
        reportee_statement = reportee_statement.where(WeeklyCompliance.status == status)
    
    # Apply exception filter
    if exception and exception != "All":
        if exception == "default":
            reportee_statement = reportee_statement.where(
                or_(
                    WeeklyCompliance.exception == None,
                    WeeklyCompliance.exception == ""
                )
            )
        else:
            reportee_statement = reportee_statement.where(WeeklyCompliance.exception == exception)
    
    all_reportee_records = session.exec(reportee_statement).all()
    unique_reportee_ids = list(set(record.employee_id for record in all_reportee_records))
    
    # Apply search filter
    if search and search.strip():
        search_lower = search.strip().lower()
        filtered_employee_ids = []
        for emp_id in unique_reportee_ids:
            employee_records = [r for r in all_reportee_records if r.employee_id == emp_id]
            if employee_records:
                record = employee_records[0]
                if (search_lower in (record.employee_id or "").lower() or
                    search_lower in (record.employee_name or "").lower() or
                    search_lower in (record.reporting_manager_name or "").lower() or
                    search_lower in (record.vertical_head_name or "").lower() or
                    search_lower in (record.vertical or "").lower()):
                    filtered_employee_ids.append(emp_id)
        unique_reportee_ids = filtered_employee_ids
    
    # Pagination for reportees
    total_count = len(unique_reportee_ids)
    unique_reportee_ids.sort()
    offset = (page - 1) * page_size
    paginated_reportee_ids = unique_reportee_ids[offset:offset + page_size]
    
    # Build weeks list from all records (current_employee + reportees) to ensure consistency
    all_records_for_weeks = current_employee_records + all_reportee_records
    _, weeks = build_employee_dict(all_records_for_weeks)
    
    if not paginated_reportee_ids:
        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            "employees": [],
            "weeks": weeks,
            "current_employee": current_employee_data,
            "reportees": []
        }
    
    reportee_compliance_records = [r for r in all_reportee_records if r.employee_id in paginated_reportee_ids]
    reportees_dict, _ = build_employee_dict(reportee_compliance_records)
    reportees_data = list(reportees_dict.values())
    
    result = {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        "employees": reportees_data,
        "weeks": weeks,
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
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
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
    if quarter < 1 or quarter > 4:
        raise HTTPException(status_code=400, detail="Quarter must be between 1 and 4")
    
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
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating quarterly compliance: {str(e)}"
        )


@router.get("/monthly")
async def get_monthly_compliance(
    year: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    exception: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    # Helper function to build employee data dict
    def build_employee_dict(records):
        employees_dict = {}
        months_dict = {}
        
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        for record in records:
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
        return employees_dict, [{"key": k, **v} for k, v in sorted_months]
    
    # For non-admin users, fetch current_employee data separately (without search/filters/pagination)
    current_employee_data = None
    current_employee_records = []
    current_employee_months = []
    
    if not is_admin(current_employee.employee_id):
        # Fetch current employee's data separately (no search/filters/pagination)
        current_emp_statement = select(MonthlyCompliance).where(
            MonthlyCompliance.employee_id == current_employee.employee_id
        )
        
        if year:
            current_emp_statement = current_emp_statement.where(MonthlyCompliance.year == year)
        
        current_employee_records = session.exec(current_emp_statement).all()
        if current_employee_records:
            current_emp_dict, current_employee_months = build_employee_dict(current_employee_records)
            current_employee_data = current_emp_dict.get(current_employee.employee_id)
    
    # Fetch reportees data with search/filters/pagination
    reportee_statement = select(MonthlyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_ids_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_ids_statement).all()
        reportee_ids = list(reportees)
        if reportee_ids:
            reportee_statement = reportee_statement.where(MonthlyCompliance.employee_id.in_(reportee_ids))
        else:
            # No reportees, return current employee data only
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "employees": [],
                "months": current_employee_months,
                "current_employee": current_employee_data,
                "reportees": []
            }
    
    # Apply date filters
    if year:
        reportee_statement = reportee_statement.where(MonthlyCompliance.year == year)
    
    # Apply status filter
    if status and status.lower() != "all":
        reportee_statement = reportee_statement.where(MonthlyCompliance.status == status)
    
    # Apply exception filter
    if exception and exception != "All":
        if exception == "default":
            reportee_statement = reportee_statement.where(
                or_(
                    MonthlyCompliance.exception == None,
                    MonthlyCompliance.exception == ""
                )
            )
        else:
            reportee_statement = reportee_statement.where(MonthlyCompliance.exception == exception)
    
    all_reportee_records = session.exec(reportee_statement).all()
    unique_reportee_ids = list(set(record.employee_id for record in all_reportee_records))
    
    # Apply search filter
    if search and search.strip():
        search_lower = search.strip().lower()
        filtered_employee_ids = []
        for emp_id in unique_reportee_ids:
            employee_records = [r for r in all_reportee_records if r.employee_id == emp_id]
            if employee_records:
                record = employee_records[0]
                if (search_lower in (record.employee_id or "").lower() or
                    search_lower in (record.employee_name or "").lower() or
                    search_lower in (record.reporting_manager_name or "").lower() or
                    search_lower in (record.vertical_head_name or "").lower() or
                    search_lower in (record.vertical or "").lower()):
                    filtered_employee_ids.append(emp_id)
        unique_reportee_ids = filtered_employee_ids
    
    # Pagination for reportees
    total_count = len(unique_reportee_ids)
    unique_reportee_ids.sort()
    offset = (page - 1) * page_size
    paginated_reportee_ids = unique_reportee_ids[offset:offset + page_size]
    
    # Build months list from all records (current_employee + reportees) to ensure consistency
    all_records_for_months = current_employee_records + all_reportee_records
    _, months = build_employee_dict(all_records_for_months)
    
    if not paginated_reportee_ids:
        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            "employees": [],
            "months": months,
            "current_employee": current_employee_data,
            "reportees": []
        }
    
    reportee_compliance_records = [r for r in all_reportee_records if r.employee_id in paginated_reportee_ids]
    reportees_dict, _ = build_employee_dict(reportee_compliance_records)
    reportees_data = list(reportees_dict.values())
    
    result = {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        "employees": reportees_data,
        "months": months,
    }
    
    if not is_admin(current_employee.employee_id):
        result["current_employee"] = current_employee_data
        result["reportees"] = reportees_data
    
    return result


@router.get("/quarterly")
async def get_quarterly_compliance(
    year: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    exception: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    # Helper function to build employee data dict
    def build_employee_dict(records):
        employees_dict = {}
        quarters_dict = {}
        
        for record in records:
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
        return employees_dict, [{"key": k, **v} for k, v in sorted_quarters]
    
    # For non-admin users, fetch current_employee data separately (without search/filters/pagination)
    current_employee_data = None
    current_employee_records = []
    current_employee_quarters = []
    
    if not is_admin(current_employee.employee_id):
        # Fetch current employee's data separately (no search/filters/pagination)
        current_emp_statement = select(QuarterlyCompliance).where(
            QuarterlyCompliance.employee_id == current_employee.employee_id
        )
        
        if year:
            current_emp_statement = current_emp_statement.where(QuarterlyCompliance.year == year)
        
        current_employee_records = session.exec(current_emp_statement).all()
        if current_employee_records:
            current_emp_dict, current_employee_quarters = build_employee_dict(current_employee_records)
            current_employee_data = current_emp_dict.get(current_employee.employee_id)
    
    # Fetch reportees data with search/filters/pagination
    reportee_statement = select(QuarterlyCompliance)
    
    if not is_admin(current_employee.employee_id):
        reportee_ids_statement = select(Employee.employee_id).where(
            (Employee.reporting_manager_id == current_employee.employee_id) |
            (Employee.vertical_head_id == current_employee.employee_id)
        )
        reportees = session.exec(reportee_ids_statement).all()
        reportee_ids = list(reportees)
        if reportee_ids:
            reportee_statement = reportee_statement.where(QuarterlyCompliance.employee_id.in_(reportee_ids))
        else:
            # No reportees, return current employee data only
            return {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0,
                "employees": [],
                "quarters": current_employee_quarters,
                "current_employee": current_employee_data,
                "reportees": []
            }
    
    # Apply date filters
    if year:
        reportee_statement = reportee_statement.where(QuarterlyCompliance.year == year)
    
    # Apply status filter
    if status and status.lower() != "all":
        reportee_statement = reportee_statement.where(QuarterlyCompliance.status == status)
    
    # Apply exception filter
    if exception and exception != "All":
        if exception == "default":
            reportee_statement = reportee_statement.where(
                or_(
                    QuarterlyCompliance.exception == None,
                    QuarterlyCompliance.exception == ""
                )
            )
        else:
            reportee_statement = reportee_statement.where(QuarterlyCompliance.exception == exception)
    
    all_reportee_records = session.exec(reportee_statement).all()
    unique_reportee_ids = list(set(record.employee_id for record in all_reportee_records))
    
    # Apply search filter
    if search and search.strip():
        search_lower = search.strip().lower()
        filtered_employee_ids = []
        for emp_id in unique_reportee_ids:
            employee_records = [r for r in all_reportee_records if r.employee_id == emp_id]
            if employee_records:
                record = employee_records[0]
                if (search_lower in (record.employee_id or "").lower() or
                    search_lower in (record.employee_name or "").lower() or
                    search_lower in (record.reporting_manager_name or "").lower() or
                    search_lower in (record.vertical_head_name or "").lower() or
                    search_lower in (record.vertical or "").lower()):
                    filtered_employee_ids.append(emp_id)
        unique_reportee_ids = filtered_employee_ids
    
    # Pagination for reportees
    total_count = len(unique_reportee_ids)
    unique_reportee_ids.sort()
    offset = (page - 1) * page_size
    paginated_reportee_ids = unique_reportee_ids[offset:offset + page_size]
    
    # Build quarters list from all records (current_employee + reportees) to ensure consistency
    all_records_for_quarters = current_employee_records + all_reportee_records
    _, quarters = build_employee_dict(all_records_for_quarters)
    
    if not paginated_reportee_ids:
        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
            "employees": [],
            "quarters": quarters,
            "current_employee": current_employee_data,
            "reportees": []
        }
    
    reportee_compliance_records = [r for r in all_reportee_records if r.employee_id in paginated_reportee_ids]
    reportees_dict, _ = build_employee_dict(reportee_compliance_records)
    reportees_data = list(reportees_dict.values())
    
    result = {
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        "employees": reportees_data,
        "quarters": quarters,
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
    table_map = {
        "attendance": Attendance,
        "weekly_compliance": WeeklyCompliance,
        "monthly_compliance": MonthlyCompliance,
        "quarterly_compliance": QuarterlyCompliance,
    }
    
    if table_name and table_name.lower() == "employee":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete Employee table. Employee records must be preserved for authentication."
        )
    
    deleted_counts = {}
    
    if table_name:
        table_name_lower = table_name.lower()
        if table_name_lower not in table_map:
            valid_tables = ", ".join(table_map.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid table name '{table_name}'. Valid options: {valid_tables}"
            )
        
        session.exec(delete(table_map[table_name_lower]))
        deleted_counts[table_name_lower] = "all"
        message = f"Data from '{table_name_lower}' table has been deleted."
    else:
        session.exec(delete(QuarterlyCompliance))
        deleted_counts["quarterly_compliance"] = "all"
        session.exec(delete(MonthlyCompliance))
        deleted_counts["monthly_compliance"] = "all"
        session.exec(delete(WeeklyCompliance))
        deleted_counts["weekly_compliance"] = "all"
        session.exec(delete(Attendance))
        deleted_counts["attendance"] = "all"
        message = "All data from attendance and compliance tables has been deleted. Employee records preserved."
    
    session.commit()
    
    return {
        "message": message,
        "deleted_counts": deleted_counts,
        "note": "Employee records were preserved to maintain authentication capability" if not table_name else None
    }

