"""Admissible seven-point scores; missing and invalid never become zero."""
import math

def discrete_score(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        n = float(value)
    except (ValueError, TypeError, OverflowError):
        return None
    return int(n) if math.isfinite(n) and n.is_integer() and -3 <= n <= 3 else None
