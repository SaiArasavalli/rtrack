"""Attendance routes."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import Optional
import pandas as pd
import traceback
from backend.models import Employee, Attendance
from backend.database import get_session
from backend.auth import get_current_employee, get_current_admin_employee
from backend.services.attendance_service import clean_attendance_excel
from backend.services.compliance_service import calculate_weekly_compliance

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/upload")
async def upload_attendance(
    file: UploadFile = File(..., description="Attendance Excel file"),
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Uploads attendance Excel file and stores attendance records."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)"
        )
    
    try:
        contents = await file.read()
        cleaned_records = clean_attendance_excel(contents)
        
        if not cleaned_records:
            raise HTTPException(
                status_code=400,
                detail="No valid attendance records found in the Excel file"
            )
        
        first_record = cleaned_records[0]
        week_start = first_record["week_start"]
        week_end = first_record["week_end"]
        
        existing_week = session.exec(
            select(Attendance).where(
                Attendance.week_start == week_start,
                Attendance.week_end == week_end
            ).limit(1)
        ).first()
        
        if existing_week:
            week_start_str = week_start.strftime("%d %b %Y")
            week_end_str = week_end.strftime("%d %b %Y")
            raise HTTPException(
                status_code=400,
                detail=f"Attendance data already exists for this week ({week_start_str} to {week_end_str}). Please upload data for a different week."
            )
        
        employee_ids = [r["employee_id"] for r in cleaned_records]
        statement = select(Employee).where(Employee.employee_id.in_(employee_ids))
        employees = session.exec(statement).all()
        employee_dict = {emp.employee_id: emp.employee_name for emp in employees}
        
        for record in cleaned_records:
            emp_id = record["employee_id"]
            if emp_id in employee_dict:
                record["employee_name"] = employee_dict[emp_id]
        
        attendance_records = []
        for record in cleaned_records:
            attendance = Attendance(**record)
            attendance_records.append(attendance)
        
        session.add_all(attendance_records)
        session.commit()
        
        try:
            week_start_date = first_record["week_start"]
            week_end_date = first_record["week_end"]
            week_num = first_record.get("week_number", 0)
            
            week_start_pd = pd.Timestamp(week_start_date)
            week_end_pd = pd.Timestamp(week_end_date)
            
            compliance_records = calculate_weekly_compliance(
                session,
                week_start_pd,
                week_end_pd,
                week_num
            )
            
            compliance_message = f" and calculated compliance for {len(compliance_records)} employees"
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"ERROR in compliance calculation: {str(e)}")
            print(f"Traceback: {error_trace}")
            compliance_message = f" (Note: Compliance calculation failed: {str(e)})"
        
        return JSONResponse(
            status_code=200,
            content={
                "message": "Attendance file uploaded successfully" + compliance_message,
                "records_loaded": len(attendance_records),
                "filename": file.filename,
                "date_range": {
                    "start": min(r["date"].isoformat() for r in cleaned_records),
                    "end": max(r["date"].isoformat() for r in cleaned_records)
                }
            }
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing Excel file: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing attendance file: {str(e)}"
        )


@router.get("/last-upload")
async def get_last_upload_info(
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_admin_employee)
):
    """Returns information about the last attendance upload."""
    # Get the most recently created attendance record
    latest_attendance = session.exec(
        select(Attendance)
        .order_by(Attendance.created_at.desc())
        .limit(1)
    ).first()
    
    if not latest_attendance:
        return {
            "has_upload": False,
            "message": "No attendance data has been uploaded yet"
        }
    
    # Get all records from the same week (same upload batch)
    week_start = latest_attendance.week_start
    week_end = latest_attendance.week_end
    week_records = session.exec(
        select(Attendance).where(
            Attendance.week_start == week_start,
            Attendance.week_end == week_end
        )
    ).all()
    
    # Get date range from the records
    dates = [record.date for record in week_records]
    min_date = min(dates)
    max_date = max(dates)
    
    # Count unique employees
    unique_employees = len(set(record.employee_id for record in week_records))
    
    return {
        "has_upload": True,
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "week_number": latest_attendance.week_number,
        "year": latest_attendance.year,
        "date_range": {
            "start": min_date.isoformat(),
            "end": max_date.isoformat()
        },
        "records_count": len(week_records),
        "employees_count": unique_employees,
        "uploaded_at": latest_attendance.created_at.isoformat() if latest_attendance.created_at else None
    }


@router.get("")
async def get_attendance(
    session: Session = Depends(get_session),
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns attendance records for the latest week."""
    all_attendances = session.exec(select(Attendance)).all()
    total_count = len(all_attendances)
    
    latest_attendance = session.exec(
        select(Attendance)
        .order_by(Attendance.week_start.desc(), Attendance.date.desc())
        .limit(1)
    ).first()
    
    if latest_attendance:
        week_start = latest_attendance.week_start
        week_end = latest_attendance.week_end
        statement = select(Attendance).where(
            Attendance.week_start == week_start,
            Attendance.week_end == week_end
        ).order_by(Attendance.date.desc(), Attendance.employee_id.asc())
        attendances = session.exec(statement).all()
    else:
        attendances = []
    
    return {
        "total": total_count,
        "attendances": attendances
    }



