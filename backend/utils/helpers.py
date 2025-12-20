"""
Utility helper functions for the application.
Add reusable utility functions here.
"""

from datetime import datetime
import re


def format_date(date_obj):
    """Format datetime object to string."""
    if not date_obj:
        return None
    return date_obj.strftime('%Y-%m-%d %H:%M:%S')


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_string(text: str) -> str:
    """Remove potentially harmful characters from string."""
    if not text:
        return ""
    return text.strip()


# Add more utility functions here
