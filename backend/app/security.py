from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, role: str = "WORKER") -> str:
    settings = get_settings()
    payload = {"sub": subject, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def current_identity(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Authentication required."})
    try:
        payload = jwt.decode(credentials.credentials, get_settings().jwt_secret, algorithms=["HS256"])
        if not payload.get("sub") or payload.get("role") not in ("WORKER", "CUSTOMER", "ADMIN"):
            raise ValueError("invalid identity")
        return payload
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail={"code": "INVALID_SESSION", "message": "Session is invalid or expired."})