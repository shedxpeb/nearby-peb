from functools import lru_cache
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    direct_url: str = ""
    jwt_secret: str = "dev-only-replace-before-production"
    session_secret: str = "dev-only-session-replace-before-production"
    maptiler_api_key: str = ""
    emergent_llm_key: str = ""
    app_base_url: str = "http://localhost:8081"
    api_base_url: str = "http://localhost:8001"
    storage_provider: str = "external-url"
    allowed_origins: str = "*"
    app_version: str = "1.0.0"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [x.strip() for x in self.allowed_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def is_placeholder_database(url: str) -> bool:
    return not url or "your-project" in url or "placeholder" in url