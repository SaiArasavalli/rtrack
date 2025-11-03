"""Shared utilities for compliance calculations."""

import pandas as pd
import numpy as np

DEFAULT_REQUIREMENTS = {
    'weekly_days': 2.0,
    'weekly_hours': 15.5,
    'monthly_days': 8.0,
    'monthly_hours': 62.0,
    'quarterly_days': 24.0,
    'quarterly_hours': 186.0,
}


def parse_exceptions(exc):
    """Parses exception string to derive custom compliance requirements."""
    if exc == "other":
        return pd.Series({k: np.nan for k in DEFAULT_REQUIREMENTS})
    
    defaults = DEFAULT_REQUIREMENTS
    weekly_days = defaults['weekly_days']
    monthly_days = defaults['monthly_days']
    quarterly_days = defaults['quarterly_days']
    
    if pd.notna(exc):
        try:
            period, val_str, _ = exc.split('_')
            val = int(val_str)
            default_days_key = f'{period}_days'
            
            if default_days_key not in defaults:
                return pd.Series({k: np.nan for k in defaults})
            
            ratio = val / defaults[default_days_key]
            weekly_days = defaults['weekly_days'] * ratio
            monthly_days = defaults['monthly_days'] * ratio
            quarterly_days = defaults['quarterly_days'] * ratio
        except (ValueError, AttributeError, IndexError, KeyError):
            pass
    
    weekly_hours = defaults['weekly_hours'] * (weekly_days / defaults['weekly_days'])
    monthly_hours = defaults['monthly_hours'] * (monthly_days / defaults['monthly_days'])
    quarterly_hours = defaults['quarterly_hours'] * (quarterly_days / defaults['quarterly_days'])
    
    return pd.Series({
        'weekly_days': round(weekly_days, 2),
        'weekly_hours': round(weekly_hours, 2),
        'monthly_days': round(monthly_days, 2),
        'monthly_hours': round(monthly_hours, 2),
        'quarterly_days': round(quarterly_days, 2),
        'quarterly_hours': round(quarterly_hours, 2),
    })

