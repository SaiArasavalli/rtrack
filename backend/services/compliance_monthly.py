"""Monthly compliance calculation module."""

import pandas as pd
import numpy as np
from typing import List
from sqlmodel import Session, select
from backend.models import Employee, Attendance, MonthlyCompliance
from backend.services.compliance_utils import DEFAULT_REQUIREMENTS, parse_exceptions


def calculate_monthly_compliance(
    session: Session,
    year: int,
    month: int
) -> List[MonthlyCompliance]:
    """
    Calculates monthly compliance for all employees.
    
    Args:
        session: Database session
        year: Year
        month: Month (1-12)
        
    Returns:
        List of MonthlyCompliance records
    """
    # Use month_number and year fields from Attendance table
    attendance_statement = select(Attendance).where(
        Attendance.month_number == month,
        Attendance.year == year
    )
    attendances = session.exec(attendance_statement).all()
    
    # Calculate month_start and month_end for the compliance record
    month_start = pd.Timestamp(year=year, month=month, day=1)
    month_end = month_start + pd.offsets.MonthEnd(0)
    
    if not attendances:
        return []
    
    attendance_data = []
    for att in attendances:
        attendance_data.append({
            'employee_id': att.employee_id,
            'employee_name': att.employee_name,
            'is_present': att.is_present,
            'hours_worked': att.hours_worked or 0.0,
            'date': att.date,
        })
    
    df_attendance = pd.DataFrame(attendance_data)
    
    df_monthly = (
        df_attendance.groupby('employee_id')
        .agg({
            'is_present': 'sum',
            'hours_worked': 'sum',
            'date': ['min', 'max'],
        })
        .reset_index()
    )
    
    if isinstance(df_monthly.columns, pd.MultiIndex):
        df_monthly.columns = ['employee_id', 'total_days_present', 'total_hours_worked', 'month_start', 'month_end']
    else:
        df_monthly = df_monthly.rename(columns={
            ('is_present', 'sum'): 'total_days_present',
            ('hours_worked', 'sum'): 'total_hours_worked',
            ('date', 'min'): 'month_start',
            ('date', 'max'): 'month_end',
        })
    df_monthly['total_days_present'] = df_monthly['total_days_present'].astype(float)
    df_monthly['total_hours_worked'] = df_monthly['total_hours_worked'].astype(float)
    
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
        
        monthly_days_list = []
        monthly_hours_list = []
        
        for idx in df_employee.index:
            req = exception_requirements.loc[idx]
            
            if isinstance(req, pd.Series):
                try:
                    monthly_days_val = req.get('monthly_days', DEFAULT_REQUIREMENTS['monthly_days'])
                    monthly_hours_val = req.get('monthly_hours', DEFAULT_REQUIREMENTS['monthly_hours'])
                    
                    if pd.isna(monthly_days_val):
                        monthly_days_list.append(np.nan)
                    else:
                        monthly_days_list.append(float(monthly_days_val))
                    
                    if pd.isna(monthly_hours_val):
                        monthly_hours_list.append(np.nan)
                    else:
                        monthly_hours_list.append(float(monthly_hours_val))
                except (KeyError, AttributeError, TypeError):
                    monthly_days_list.append(DEFAULT_REQUIREMENTS['monthly_days'])
                    monthly_hours_list.append(DEFAULT_REQUIREMENTS['monthly_hours'])
            else:
                monthly_days_list.append(DEFAULT_REQUIREMENTS['monthly_days'])
                monthly_hours_list.append(DEFAULT_REQUIREMENTS['monthly_hours'])
        
        df_employee['monthly_days'] = monthly_days_list
        df_employee['monthly_hours'] = monthly_hours_list
    else:
        df_employee['monthly_days'] = DEFAULT_REQUIREMENTS['monthly_days']
        df_employee['monthly_hours'] = DEFAULT_REQUIREMENTS['monthly_hours']
    
    # 3. Merge employee master and monthly summary
    df_merged = df_employee.merge(
        df_monthly,
        how='left',
        on='employee_id',
        indicator=True
    )
    
    # 4. Fill missing values
    df_merged['total_days_present'] = df_merged['total_days_present'].fillna(0)
    df_merged['total_hours_worked'] = df_merged['total_hours_worked'].fillna(0)
    
    # Fill month_start and month_end
    df_merged['month_start'] = df_merged['month_start'].fillna(month_start.date())
    df_merged['month_end'] = df_merged['month_end'].fillna(month_end.date())
    
    # 5. Compliance logic
    # Priority 1: If exception is 'other' => always compliant
    exception_str = df_merged['exception'].astype(str).str.lower()
    exception_str = exception_str.replace('nan', '')
    
    is_other_exception = (exception_str == 'other')
    
    no_attendance = df_merged['_merge'] == 'left_only'
    
    meets_requirements = (
        (~no_attendance) &
        (df_merged['total_days_present'] >= df_merged['monthly_days'].fillna(0)) &
        (df_merged['total_hours_worked'] >= df_merged['monthly_hours'].fillna(0))
    )
    
    # Order of precedence:
    # 1) exception 'other' => Compliant
    # 2) no attendance data (_merge == 'left_only') => No Data
    # 3) meets thresholds => Compliant
    conditions = [is_other_exception, no_attendance, meets_requirements]
    choices = [1, np.nan, 1]
    df_merged['is_compliant'] = np.select(conditions, choices, default=0)
    
    COMPLIANCE_MAP = {1: 'Compliant', 0: 'Not Compliant', np.nan: 'No Data'}
    df_merged['compliance_status'] = df_merged['is_compliant'].map(COMPLIANCE_MAP)
    
    df_merged = df_merged.drop(columns=['_merge'])
    
    compliance_records = []
    for _, row in df_merged.iterrows():
        compliance = MonthlyCompliance(
            employee_id=row['employee_id'],
            employee_name=row['employee_name'],
            reporting_manager_id=row.get('reporting_manager_id'),
            reporting_manager_name=row.get('reporting_manager_name'),
            vertical_head_id=row.get('vertical_head_id'),
            vertical_head_name=row.get('vertical_head_name'),
            vertical=row.get('vertical'),
            status=row.get('status'),
            exception=row.get('exception'),
            monthly_days=float(row['monthly_days']) if pd.notna(row.get('monthly_days')) else None,
            monthly_hours=float(row['monthly_hours']) if pd.notna(row.get('monthly_hours')) else None,
            month=month,
            year=year,
            month_start=row['month_start'] if pd.notna(row['month_start']) else month_start.date(),
            month_end=row['month_end'] if pd.notna(row['month_end']) else month_end.date(),
            total_days_present=float(row['total_days_present']),
            total_hours_worked=float(row['total_hours_worked']),
            is_compliant=int(row['is_compliant']) if pd.notna(row['is_compliant']) else None,
            compliance_status=str(row['compliance_status'])
        )
        compliance_records.append(compliance)
    
    existing_compliance = session.exec(
        select(MonthlyCompliance).where(
            MonthlyCompliance.month == month,
            MonthlyCompliance.year == year
        )
    ).all()
    
    for existing in existing_compliance:
        session.delete(existing)
    
    session.add_all(compliance_records)
    session.commit()
    
    return compliance_records

