"""Attendance Excel file parser."""

import pandas as pd
from datetime import date, datetime, time as dt_time
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


def calculate_hours_from_swipes(swipe_in: str, swipe_out: str, record_date: date) -> Optional[float]:
    """Calculates hours worked from swipe_in and swipe_out timestamps (24-hour format).
    
    Handles cases where:
    - Both swipes are on the same day
    - Swipe_in is today and swipe_out is next day (overnight shift)
    
    Args:
        swipe_in: Time string in 24-hour format (HH:MM:SS or HH:MM)
        swipe_out: Time string in 24-hour format (HH:MM:SS or HH:MM)
        record_date: Date of the attendance record
    """
    try:
        # Try parsing as datetime objects (with date and time)
        swipe_in_dt = pd.to_datetime(swipe_in, errors='coerce')
        swipe_out_dt = pd.to_datetime(swipe_out, errors='coerce')
        
        if pd.isna(swipe_in_dt) or pd.isna(swipe_out_dt):
            # If datetime parsing fails, try parsing as time strings (24-hour format) and combine with date
            try:
                # Parse as time (HH:MM:SS or HH:MM) - 24-hour format
                swipe_in_parts = swipe_in.strip().split(':')
                swipe_out_parts = swipe_out.strip().split(':')
                
                if len(swipe_in_parts) >= 2 and len(swipe_out_parts) >= 2:
                    # Parse hours and minutes (24-hour format: hours 0-23, minutes 0-59)
                    swipe_in_hour = int(swipe_in_parts[0])
                    swipe_in_min = int(swipe_in_parts[1])
                    swipe_in_sec = int(swipe_in_parts[2]) if len(swipe_in_parts) >= 3 else 0
                    
                    swipe_out_hour = int(swipe_out_parts[0])
                    swipe_out_min = int(swipe_out_parts[1])
                    swipe_out_sec = int(swipe_out_parts[2]) if len(swipe_out_parts) >= 3 else 0
                    
                    # Validate 24-hour format: hours 0-23, minutes 0-59, seconds 0-59
                    if not (0 <= swipe_in_hour <= 23 and 0 <= swipe_in_min <= 59 and 0 <= swipe_in_sec <= 59):
                        return None
                    if not (0 <= swipe_out_hour <= 23 and 0 <= swipe_out_min <= 59 and 0 <= swipe_out_sec <= 59):
                        return None
                    
                    swipe_in_time = dt_time(swipe_in_hour, swipe_in_min, swipe_in_sec)
                    swipe_out_time = dt_time(swipe_out_hour, swipe_out_min, swipe_out_sec)
                    
                    # Combine time with record date
                    swipe_in_dt = pd.Timestamp.combine(record_date, swipe_in_time)
                    swipe_out_dt = pd.Timestamp.combine(record_date, swipe_out_time)
                    
                    # If swipe_out time is earlier than swipe_in time, assume next day (overnight shift)
                    # Example: swipe_in = 22:00, swipe_out = 02:00 → swipe_out is next day
                    if swipe_out_dt < swipe_in_dt:
                        swipe_out_dt = swipe_out_dt + pd.Timedelta(days=1)
                else:
                    return None
            except (ValueError, IndexError):
                return None
        
        # Calculate difference in hours
        time_diff = swipe_out_dt - swipe_in_dt
        total_hours = time_diff.total_seconds() / 3600.0
        
        # Return the calculated hours (can be more than 24 for overnight shifts)
        if total_hours >= 0:
            return round(total_hours, 2)
        else:
            # Negative hours shouldn't happen, but return None if it does
            return None
    except Exception:
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
    
    # Normalize swipe_in and swipe_out to time strings only (HH:MM format)
    # This ensures times are stored without dates, preventing date rollover issues
    def normalize_time(value):
        """Extract time portion from datetime objects or strings, return HH:MM format."""
        if pd.isna(value):
            return None
        # If it's a datetime/timestamp, extract just the time (ignore the date)
        if isinstance(value, pd.Timestamp):
            return value.strftime('%H:%M')
        elif isinstance(value, datetime):
            return value.strftime('%H:%M')
        elif isinstance(value, dt_time):
            return value.strftime('%H:%M')
        # If it's a string, check if it contains date info
        value_str = str(value).strip()
        if ' ' in value_str and len(value_str) > 10:
            # Looks like a datetime string (e.g., "2025-06-30 13:17:55" or "2025-07-01 22:05:39")
            # Extract just the time part, ignoring the date
            parts = value_str.split(' ')
            if len(parts) >= 2:
                time_part = parts[-1]  # Get the time portion
                # Return HH:MM format (remove seconds if present)
                if ':' in time_part:
                    time_parts = time_part.split(':')
                    if len(time_parts) >= 2:
                        return f"{time_parts[0]}:{time_parts[1]}"  # Return HH:MM
                return time_part
        # Check if it's already in HH:MM or HH:MM:SS format
        if ':' in value_str:
            time_parts = value_str.split(':')
            if len(time_parts) >= 2:
                # Return HH:MM format
                return f"{time_parts[0]}:{time_parts[1]}"
        # Return as is if we can't parse it
        return value_str
    
    df["swipe_in"] = df["swipe_in"].apply(normalize_time)
    df["swipe_out"] = df["swipe_out"].apply(normalize_time)
    
    # Convert workhrs to hours_worked
    df["hours_worked"] = df["workhrs"].apply(hhmm_to_hours)
    
    # Get date column first (needed for swipe calculations)
    date_col = pd.to_datetime(df["employee_id"], errors="coerce")
    df["date"] = date_col.ffill()
    df = df[date_col.isna()].reset_index(drop=True)
    
    df["employee_id"] = df["employee_id"].str.upper().apply(
        lambda x: x if x.startswith("GCC") else f"GCC{x}"
    )
    
    # Helper flags
    has_swipe_in = df["swipe_in"].notna()
    has_swipe_out = df["swipe_out"].notna()
    has_workhrs = df["workhrs"].notna()
    # Check if workhrs is zero or missing (after conversion to hours)
    workhrs_is_zero = (df["hours_worked"] == 0.0) & has_workhrs
    workhrs_missing_or_zero = workhrs_is_zero | (~has_workhrs)
    
    # Initialize is_present to 0 and hours_worked to 0
    df["is_present"] = 0
    df["hours_worked"] = df["hours_worked"].fillna(0.0)
    
    # Track which records have been processed (to ensure priority order)
    processed_mask = pd.Series([False] * len(df), index=df.index)
    
    # Rule 1: Both swipes exist AND workhrs exists
    # is_present = 1, hours_worked from workhrs
    rule1_mask = has_swipe_in & has_swipe_out & has_workhrs & ~processed_mask
    df.loc[rule1_mask, "is_present"] = 1
    # hours_worked already calculated from workhrs above
    processed_mask |= rule1_mask
    
    # Rule 2: Both swipes exist BUT workhrs missing or 0
    # is_present = 1, hours_worked from swipe difference (consider night shifts)
    rule2_mask = has_swipe_in & has_swipe_out & workhrs_missing_or_zero & ~processed_mask
    df.loc[rule2_mask, "is_present"] = 1
    
    for idx in df[rule2_mask].index:
        swipe_in_val = str(df.loc[idx, "swipe_in"]).strip()
        swipe_out_val = str(df.loc[idx, "swipe_out"]).strip()
        record_date = df.loc[idx, "date"]
        
        # Convert pandas Timestamp to Python date if needed
        if isinstance(record_date, pd.Timestamp):
            record_date = record_date.date()
        elif hasattr(record_date, 'date'):
            record_date = record_date.date()
        
        calculated_hours = calculate_hours_from_swipes(swipe_in_val, swipe_out_val, record_date)
        if calculated_hours is not None:
            df.loc[idx, "hours_worked"] = calculated_hours
        else:
            # If calculation fails, keep hours_worked as 0 (or could set to default 6)
            # But since both swipes exist, we should have been able to calculate
            # Keeping as 0 for now - could be improved with logging
            pass
    
    processed_mask |= rule2_mask
    
    # Rule 3: Only one swipe exists AND workhrs exists
    # is_present = 1, hours_worked from workhrs
    only_one_swipe = (has_swipe_in & ~has_swipe_out) | (~has_swipe_in & has_swipe_out)
    rule3_mask = only_one_swipe & has_workhrs & ~processed_mask
    df.loc[rule3_mask, "is_present"] = 1
    # hours_worked already calculated from workhrs above
    processed_mask |= rule3_mask
    
    # Rule 4: Only one swipe exists BUT workhrs missing or zero
    # is_present = 1, hours_worked = 6 (default)
    rule4_mask = only_one_swipe & workhrs_missing_or_zero & ~processed_mask
    df.loc[rule4_mask, "is_present"] = 1
    df.loc[rule4_mask, "hours_worked"] = 6.0
    processed_mask |= rule4_mask
    
    # Rule 5: Both swipes missing AND workhrs exists
    # is_present = 1, hours_worked from workhrs
    both_swipes_missing = ~has_swipe_in & ~has_swipe_out
    rule5_mask = both_swipes_missing & has_workhrs & ~processed_mask
    df.loc[rule5_mask, "is_present"] = 1
    # hours_worked already calculated from workhrs above
    processed_mask |= rule5_mask
    
    # Rule 6: Both swipes missing AND workhrs missing or zero
    # is_present = 0, hours_worked = 0
    rule6_mask = both_swipes_missing & workhrs_missing_or_zero & ~processed_mask
    df.loc[rule6_mask, "is_present"] = 0
    df.loc[rule6_mask, "hours_worked"] = 0.0
    # processed_mask update not needed as this is the last rule
    
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
            swipe_in = str(swipe_in).strip() if swipe_in else None
        else:
            swipe_in = None
        
        swipe_out = row.get('swipe_out')
        if pd.notna(swipe_out):
            swipe_out = str(swipe_out).strip() if swipe_out else None
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
