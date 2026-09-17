import re


def normalize_phone(phone: str) -> str:
    """Normalize phone number by removing all non-digit characters."""
    return re.sub(r'\D', '', phone)


def normalize_email(email: str | None) -> str | None:
    """Normalize email address by converting to lowercase and trimming whitespace."""
    return email.lower().strip() if email else None
