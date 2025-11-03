"""Weekly compliance calculation module."""

import pandas as pd
import numpy as np
from typing import List
from sqlmodel import Session, select
from backend.models import Employee, Attendance, WeeklyCompliance
from backend.services.compliance_utils import DEFAULT_REQUIREMENTS, parse_exceptions


def calculate_weekly_compliance(
    session: Session,
    week_start: pd.Timestamp,
    week_end: pd.Timestamp,
    week_number: int
) -> List[WeeklyCompliance]:
    """
    Calculates weekly compliance for all employees.
    
    Args:
        session: Database session
        week_start: Week start date (Monday)
        week_end: Week end date (Friday)
        week_number: Week number
        
    Returns:
        List of WeeklyCompliance records
    """
    attendance_statement = select(Attendance).where(
        Attendance.week_start == week_start.date(),
        Attendance.week_end == week_end.date()
    )
    attendances = session.exec(attendance_statement).all()
    
    if not attendances:
        return []
    
    attendance_data = []
    for att in attendances:
        attendance_data.append({
            'employee_id': att.employee_id,
            'employee_name': att.employee_name,
            'week_number': att.week_number,
            'week_start': att.week_start,
            'week_end': att.week_end,
            'is_present': att.is_present,
            'hours_worked': att.hours_worked or 0.0,
        })
    
    df_attendance = pd.DataFrame(attendance_data)
    
    df_weekly = (
        df_attendance.groupby('employee_id')
        .agg({
            'week_number': 'first',
            'week_start': 'first',
            'week_end': 'first',
            'is_present': 'sum',
            'hours_worked': 'sum',
        })
        .reset_index()
    )
    df_weekly = df_weekly.rename(columns={
        'is_present': 'total_days_present',
        'hours_worked': 'total_hours_worked'
    })
    
    df_weekly['total_days_present'] = df_weekly['total_days_present'].astype(float)
    df_weekly['total_hours_worked'] = df_weekly['total_hours_worked'].astype(float)
    
    employees = session.exec(select(Employee)).all()
    employee_data = []
    for emp in employees:
        employee_data.append({
            'employee_id': emp.employee_id,
            'employee_name': emp.employee_name,
            'reporting_manager_id': emp.reporting_manager_id,
            'reporting_manager_name': emp.reporting_manager_name,
            'vertical_head_id': emp.vertical_head_id,
            'vertical_head_name': emp.vertical_head_name,
            'vertical': emp.vertical,
            'status': emp.status,
            'exception': emp.exception,
        })
    
    df_employee = pd.DataFrame(employee_data)
    
    if 'exception' in df_employee.columns:
        exception_requirements = df_employee['exception'].apply(parse_exceptions)
        weekly_days_list = []
        weekly_hours_list = []
        
        for idx in df_employee.index:
            req = exception_requirements.loc[idx]
            
            if isinstance(req, pd.Series):
                try:
                    weekly_days_val = req.get('weekly_days', DEFAULT_REQUIREMENTS['weekly_days'])
                    weekly_hours_val = req.get('weekly_hours', DEFAULT_REQUIREMENTS['weekly_hours'])
                    
                    if pd.isna(weekly_days_val):
                        weekly_days_list.append(np.nan)
                    else:
                        weekly_days_list.append(float(weekly_days_val))
                    
                    if pd.isna(weekly_hours_val):
                        weekly_hours_list.append(np.nan)
                    else:
                        weekly_hours_list.append(float(weekly_hours_val))
                except (KeyError, AttributeError, TypeError):
                    weekly_days_list.append(DEFAULT_REQUIREMENTS['weekly_days'])
                    weekly_hours_list.append(DEFAULT_REQUIREMENTS['weekly_hours'])
            else:
                weekly_days_list.append(DEFAULT_REQUIREMENTS['weekly_days'])
                weekly_hours_list.append(DEFAULT_REQUIREMENTS['weekly_hours'])
        
        df_employee['weekly_days'] = weekly_days_list
        df_employee['weekly_hours'] = weekly_hours_list
    else:
        df_employee['weekly_days'] = DEFAULT_REQUIREMENTS['weekly_days']
        df_employee['weekly_hours'] = DEFAULT_REQUIREMENTS['weekly_hours']
    
    df_merged = df_employee.merge(
        df_weekly,
        how='left',
        on='employee_id',
        indicator=True
    )
    
    df_merged['total_days_present'] = df_merged['total_days_present'].fillna(0)
    df_merged['total_hours_worked'] = df_merged['total_hours_worked'].fillna(0)
    
    if not df_weekly.empty:
        for col in ['week_number', 'week_start', 'week_end']:
            mode_val = df_weekly[col].mode().iloc[0] if len(df_weekly[col].mode()) > 0 else None
            if mode_val is not None:
                df_merged[col] = df_merged[col].fillna(mode_val)
    
    df_merged['week_number'] = df_merged['week_number'].astype('Int64')
    
    if 'weekly_days' not in df_merged.columns or df_merged['weekly_days'].isna().all():
        df_merged['weekly_days'] = DEFAULT_REQUIREMENTS['weekly_days']
    if 'weekly_hours' not in df_merged.columns or df_merged['weekly_hours'].isna().all():
        df_merged['weekly_hours'] = DEFAULT_REQUIREMENTS['weekly_hours']
    
    exception_str = df_merged['exception'].astype(str).str.lower()
    exception_str = exception_str.replace('nan', '')
    
    # Priority 1: If exception is 'other' => always compliant
    is_other_exception = (exception_str == 'other')
    
    no_attendance = df_merged['_merge'] == 'left_only'
    
    meets_requirements = (
        (~no_attendance) &
        (df_merged['total_days_present'] >= df_merged['weekly_days'].fillna(0)) &
        (df_merged['total_hours_worked'] >= df_merged['weekly_hours'].fillna(0))
    )
    
    # Order of precedence:
    # 1) exception 'other' => Compliant
    # 2) no attendance data (_merge == 'left_only') => No Data
    # 3) meets thresholds => Compliant
    conditions = [is_other_exception, no_attendance, meets_requirements]
    choices = [1.0, np.nan, 1.0]
    df_merged['is_compliant'] = np.select(conditions, choices, default=0.0)
    
    COMPLIANCE_MAP = {1.0: 'Compliant', 0.0: 'Not Compliant', np.nan: 'No Data'}
    df_merged['compliance_status'] = df_merged['is_compliant'].map(COMPLIANCE_MAP)
    
    df_merged = df_merged.drop(columns=['_merge'])
    
    compliance_records = []
    for _, row in df_merged.iterrows():
        compliance = WeeklyCompliance(
            employee_id=row['employee_id'],
            employee_name=row['employee_name'],
            reporting_manager_id=row.get('reporting_manager_id'),
            reporting_manager_name=row.get('reporting_manager_name'),
            vertical_head_id=row.get('vertical_head_id'),
            vertical_head_name=row.get('vertical_head_name'),
            vertical=row.get('vertical'),
            status=row.get('status'),
            exception=row.get('exception'),
            weekly_days=float(row['weekly_days']) if pd.notna(row.get('weekly_days')) else None,
            weekly_hours=float(row['weekly_hours']) if pd.notna(row.get('weekly_hours')) else None,
            week_number=int(row['week_number']) if pd.notna(row['week_number']) else week_number,
            week_start=row['week_start'] if pd.notna(row['week_start']) else week_start.date(),
            week_end=row['week_end'] if pd.notna(row['week_end']) else week_end.date(),
            total_days_present=float(row['total_days_present']),
            total_hours_worked=float(row['total_hours_worked']),
            is_compliant=float(row['is_compliant']) if pd.notna(row['is_compliant']) else None,
            compliance_status=str(row['compliance_status'])
        )
        compliance_records.append(compliance)
    
    existing_compliance = session.exec(
        select(WeeklyCompliance).where(
            WeeklyCompliance.week_start == week_start.date(),
            WeeklyCompliance.week_end == week_end.date()
        )
    ).all()
    
    for existing in existing_compliance:
        session.delete(existing)
    
    session.add_all(compliance_records)
    session.commit()
    
    return compliance_records
