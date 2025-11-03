"""Quarterly compliance calculation module."""

import pandas as pd
import numpy as np
from typing import List
from sqlmodel import Session, select
from backend.models import Employee, Attendance, QuarterlyCompliance
from backend.services.compliance_utils import DEFAULT_REQUIREMENTS, parse_exceptions


def calculate_quarterly_compliance(
    session: Session,
    year: int,
    quarter: int
) -> List[QuarterlyCompliance]:
    """
    Calculates quarterly compliance for all employees.
    
    Args:
        session: Database session
        year: Year
        quarter: Quarter (1-4)
        
    Returns:
        List of QuarterlyCompliance records
    """
    # Use quarter_number and year fields from Attendance table
    attendance_statement = select(Attendance).where(
        Attendance.quarter_number == quarter,
        Attendance.year == year
    )
    attendances = session.exec(attendance_statement).all()
    
    # Calculate quarter_start and quarter_end for the compliance record
    quarter_start_month = (quarter - 1) * 3 + 1
    quarter_start = pd.Timestamp(year=year, month=quarter_start_month, day=1)
    quarter_end = quarter_start + pd.offsets.QuarterEnd(0)
    
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
    
    df_quarterly = (
        df_attendance.groupby('employee_id')
        .agg({
            'is_present': 'sum',
            'hours_worked': 'sum',
            'date': ['min', 'max'],
        })
        .reset_index()
    )
    
    if isinstance(df_quarterly.columns, pd.MultiIndex):
        df_quarterly.columns = ['employee_id', 'total_days_present', 'total_hours_worked', 'quarter_start', 'quarter_end']
    else:
        df_quarterly = df_quarterly.rename(columns={
            ('is_present', 'sum'): 'total_days_present',
            ('hours_worked', 'sum'): 'total_hours_worked',
            ('date', 'min'): 'quarter_start',
            ('date', 'max'): 'quarter_end',
        })
    df_quarterly['total_days_present'] = df_quarterly['total_days_present'].astype(float)
    df_quarterly['total_hours_worked'] = df_quarterly['total_hours_worked'].astype(float)
    
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
        
        quarterly_days_list = []
        quarterly_hours_list = []
        
        for idx in df_employee.index:
            req = exception_requirements.loc[idx]
            
            if isinstance(req, pd.Series):
                try:
                    quarterly_days_val = req.get('quarterly_days', DEFAULT_REQUIREMENTS['quarterly_days'])
                    quarterly_hours_val = req.get('quarterly_hours', DEFAULT_REQUIREMENTS['quarterly_hours'])
                    
                    if pd.isna(quarterly_days_val):
                        quarterly_days_list.append(np.nan)
                    else:
                        quarterly_days_list.append(float(quarterly_days_val))
                    
                    if pd.isna(quarterly_hours_val):
                        quarterly_hours_list.append(np.nan)
                    else:
                        quarterly_hours_list.append(float(quarterly_hours_val))
                except (KeyError, AttributeError, TypeError):
                    quarterly_days_list.append(DEFAULT_REQUIREMENTS['quarterly_days'])
                    quarterly_hours_list.append(DEFAULT_REQUIREMENTS['quarterly_hours'])
            else:
                quarterly_days_list.append(DEFAULT_REQUIREMENTS['quarterly_days'])
                quarterly_hours_list.append(DEFAULT_REQUIREMENTS['quarterly_hours'])
        
        df_employee['quarterly_days'] = quarterly_days_list
        df_employee['quarterly_hours'] = quarterly_hours_list
    else:
        df_employee['quarterly_days'] = DEFAULT_REQUIREMENTS['quarterly_days']
        df_employee['quarterly_hours'] = DEFAULT_REQUIREMENTS['quarterly_hours']
    
    # 4. Merge employee master and quarterly summary
    df_merged = df_employee.merge(
        df_quarterly,
        how='left',
        on='employee_id',
        indicator=True
    )
    
    # 5. Fill missing values
    df_merged['total_days_present'] = df_merged['total_days_present'].fillna(0)
    df_merged['total_hours_worked'] = df_merged['total_hours_worked'].fillna(0)
    
    # Fill quarter_start and quarter_end
    df_merged['quarter_start'] = df_merged['quarter_start'].fillna(quarter_start.date())
    df_merged['quarter_end'] = df_merged['quarter_end'].fillna(quarter_end.date())
    
    # 6. Compliance logic
    # Priority 1: If exception is 'other' => always compliant
    exception_str = df_merged['exception'].astype(str).str.lower()
    exception_str = exception_str.replace('nan', '')
    
    is_other_exception = (exception_str == 'other')
    
    no_attendance = df_merged['_merge'] == 'left_only'
    
    meets_requirements = (
        (~no_attendance) &
        (df_merged['total_days_present'] >= df_merged['quarterly_days'].fillna(0)) &
        (df_merged['total_hours_worked'] >= df_merged['quarterly_hours'].fillna(0))
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
        compliance = QuarterlyCompliance(
            employee_id=row['employee_id'],
            employee_name=row['employee_name'],
            reporting_manager_id=row.get('reporting_manager_id'),
            reporting_manager_name=row.get('reporting_manager_name'),
            vertical_head_id=row.get('vertical_head_id'),
            vertical_head_name=row.get('vertical_head_name'),
            vertical=row.get('vertical'),
            status=row.get('status'),
            exception=row.get('exception'),
            quarterly_days=float(row['quarterly_days']) if pd.notna(row.get('quarterly_days')) else None,
            quarterly_hours=float(row['quarterly_hours']) if pd.notna(row.get('quarterly_hours')) else None,
            quarter=quarter,
            year=year,
            quarter_start=row['quarter_start'] if pd.notna(row['quarter_start']) else quarter_start.date(),
            quarter_end=row['quarter_end'] if pd.notna(row['quarter_end']) else quarter_end.date(),
            total_days_present=float(row['total_days_present']),
            total_hours_worked=float(row['total_hours_worked']),
            is_compliant=int(row['is_compliant']) if pd.notna(row['is_compliant']) else None,
            compliance_status=str(row['compliance_status'])
        )
        compliance_records.append(compliance)
    
    existing_compliance = session.exec(
        select(QuarterlyCompliance).where(
            QuarterlyCompliance.quarter == quarter,
            QuarterlyCompliance.year == year
        )
    ).all()
    
    for existing in existing_compliance:
        session.delete(existing)
    
    session.add_all(compliance_records)
    session.commit()
    
    return compliance_records

