from fastapi import Depends, HTTPException, Request
from .security import current_identity


async def require_customer(identity: dict = Depends(current_identity)):
    """Require customer role for access."""
    if identity.get("role") != "CUSTOMER":
        raise HTTPException(403, {"code": "FORBIDDEN", "message": "Customer access required"})
    return identity


async def require_worker(identity: dict = Depends(current_identity)):
    """Require worker role for access."""
    if identity.get("role") != "WORKER":
        raise HTTPException(403, {"code": "FORBIDDEN", "message": "Worker access required"})
    return identity


async def require_admin(identity: dict = Depends(current_identity)):
    """Require admin role for access."""
    if identity.get("role") != "ADMIN":
        raise HTTPException(403, {"code": "FORBIDDEN", "message": "Admin access required"})
    return identity