"""Attendance Excel file parser."""

import pandas as pd
from datetime import date
from typing import List, Dict, Optional
from io import BytesIO


def dedup_names(names: List[str], is_potential_multiindex: bool = False) -> List[str]:
    """Deduplicates column names by appending numbers."""
    seen = {}
    result = []
    for name in names:
        if name in seen:
            seen[name] += 1
            result.append(f"{name}_{seen[name]}")
        else:
            seen[name] = 0
            result.append(name)
    return result


def hhmm_to_hours(hhmm_str: Optional[str]) -> Optional[float]:
    """Converts HH:MM format string to decimal hours rounded to 2 places."""
    if pd.isna(hhmm_str) or not hhmm_str or str(hhmm_str).strip() == '':
        return None
    
    try:
        parts = str(hhmm_str).strip().split(':')
        if len(parts) >= 2:
            hours = int(parts[0])
            minutes = int(parts[1])
            total_hours = hours + minutes / 60.0
            return round(total_hours, 2)
    except:
        pass
    return None


def clean_attendance_data(df: pd.DataFrame) -> pd.DataFrame:
    """Cleans and normalizes attendance Excel data structure."""
    df = df.dropna(how="all").dropna(how="all", axis=1).reset_index(drop=True)
    
    idx_user = df[df.iloc[:, 0].astype(str).str.startswith("User")].index
    
    if not idx_user.empty:
        df = df.loc[idx_user[0]:].reset_index(drop=True)
    
    new_cols = [
        (str(a).strip() + (str(b).strip() if pd.notna(b) and str(b).strip() != "" else "")).lower()
        for a, b in zip(df.iloc[0], df.iloc[1])
    ]
    df.columns = dedup_names(new_cols, is_potential_multiindex=False)
    
    first_date_idx = df[pd.to_datetime(df.iloc[:, 0], errors="coerce").notna()].index
    
    if not first_date_idx.empty:
        start_idx = first_date_idx[0]
        df = df.iloc[start_idx:-1].reset_index(drop=True)
    else:
        raise ValueError("No date row found in first column. Check file format.")
    
    df = df.rename(columns={
        "userid": "employee_id",
        "in-spfid": "swipe_in",
        "out-spfid": "swipe_out",
        "workhrs": "workhrs"
    })[["employee_id", "swipe_in", "swipe_out", "workhrs"]].copy()
    
    df["hours_worked"] = df["workhrs"].apply(hhmm_to_hours)
    df["is_present"] = (df["swipe_in"].notna() & df["swipe_out"].notna()).astype(int)
    
    date_col = pd.to_datetime(df["employee_id"], errors="coerce")
    df["date"] = date_col.ffill()
    df = df[date_col.isna()].reset_index(drop=True)
    
    df["employee_id"] = df["employee_id"].str.upper().apply(
        lambda x: x if x.startswith("GCC") else f"GCC{x}"
    )
    
    df["week_start"] = df["date"].dt.to_period("W").apply(lambda p: p.start_time.date())
    df["week_end"] = df["week_start"].apply(lambda d: (pd.Timestamp(d) + pd.Timedelta(days=4)).date())
    df["week_number"] = df["date"].dt.isocalendar().week.astype(int)
    df["month_number"] = df["date"].dt.month
    df["quarter_number"] = (df["month_number"] - 1) // 3 + 1
    df["year"] = df["date"].dt.isocalendar().year
    
    return df


def clean_attendance_excel(file_content: bytes) -> List[Dict]:
    """Cleans attendance Excel file and returns structured records."""
    df = pd.read_excel(BytesIO(file_content), header=None)
    df_cleaned = clean_attendance_data(df)
    cleaned_records = []
    
    for _, row in df_cleaned.iterrows():
        work_hours = row.get('workhrs')
        if pd.notna(work_hours):
            work_hours = str(work_hours).strip()
        else:
            work_hours = None
        
        date_obj = row['date']
        if isinstance(date_obj, pd.Timestamp):
            date_obj = date_obj.date()
        elif hasattr(date_obj, 'date'):
            date_obj = date_obj.date()
        
        week_start = row['week_start']
        if isinstance(week_start, pd.Timestamp):
            week_start = week_start.date()
        elif hasattr(week_start, 'date'):
            week_start = week_start.date()
        
        week_end = row['week_end']
        if isinstance(week_end, pd.Timestamp):
            week_end = week_end.date()
        elif hasattr(week_end, 'date'):
            week_end = week_end.date()
        
        swipe_in = row.get('swipe_in')
        if pd.notna(swipe_in):
            swipe_in = str(swipe_in).strip()
        else:
            swipe_in = None
        
        swipe_out = row.get('swipe_out')
        if pd.notna(swipe_out):
            swipe_out = str(swipe_out).strip()
        else:
            swipe_out = None
        
        record = {
            "employee_id": str(row['employee_id']),
            "employee_name": str(row['employee_id']),  # Will be updated with actual name from Employee table
            "swipe_in": swipe_in,
            "swipe_out": swipe_out,
            "work_hours": work_hours,
            "hours_worked": row.get('hours_worked'),
            "is_present": int(row.get('is_present', 0)),
            "date": date_obj,
            "week_start": week_start,
            "week_end": week_end,
            "week_number": int(row.get('week_number', 0)),
            "month_number": int(row.get('month_number', 0)),
            "quarter_number": int(row.get('quarter_number', 0)),
            "year": int(row.get('year', 0)),
        }
        
        cleaned_records.append(record)
    
    return cleaned_records
