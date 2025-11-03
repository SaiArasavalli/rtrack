"""Utility functions for the backend."""

import re


def to_snake_case(name: str) -> str:
    """
    Converts string to snake_case.
    
    Examples:
        "Employee ID" -> "employee_id"
        "Reporting Manager Name" -> "reporting_manager_name"
        "Is Active" -> "is_active"
    """
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'[\s-]+', '_', name.strip())
    name = re.sub(r'_+', '_', name)
    return name.lower().strip('_')

