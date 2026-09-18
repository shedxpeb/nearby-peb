from functools import lru_cache
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    direct_url: str = ""
    jwt_secret: str = ""
    session_secret: str = ""
    app_base_url: str = ""
    api_base_url: str = ""
    storage_provider: str = "local"
    storage_root: str = "./storage"
    storage_public_url: str = ""
    allowed_origins: str = ""
    environment: str = "development"
    app_version: str = "1.0.0"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Normalize URLs: remove trailing slashes for consistency
        self.api_base_url = self.api_base_url.rstrip("/")
        self.app_base_url = self.app_base_url.rstrip("/")
        self.storage_public_url = self.storage_public_url.rstrip("/")
        
        # Fail-fast for production secrets
        if self.environment == "production":
            if not self.jwt_secret or self.jwt_secret in ("", "dev-only-replace-before-production"):
                raise ValueError("JWT_SECRET must be set in production environment")
            if not self.session_secret or self.session_secret in ("", "dev-only-session-replace-before-production"):
                raise ValueError("SESSION_SECRET must be set in production environment")
            if not self.database_url:
                raise ValueError("DATABASE_URL must be set in production environment")
            if not self.api_base_url:
                raise ValueError("API_BASE_URL must be set in production environment")
            if not self.app_base_url:
                raise ValueError("APP_BASE_URL must be set in production environment")
            if not self.storage_public_url:
                raise ValueError("STORAGE_PUBLIC_URL must be set in production environment")
            if not self.allowed_origins:
                raise ValueError("ALLOWED_ORIGINS must be set in production environment")

    @property
    def origins(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        # Normalize origins: trim whitespace and remove trailing slashes
        return [x.strip().rstrip("/") for x in self.allowed_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def is_placeholder_database(url: str) -> bool:
    return not url or "your-project" in url or "placeholder" in url