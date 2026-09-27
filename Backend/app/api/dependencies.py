from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.config import Settings, settings
from app.database.database import get_db


def get_current_settings() -> Settings:
    """Dependency returning the global application settings."""
    return settings


# Re-export get_db for cleaner imports in route modules
__all__ = ["get_db", "get_current_settings"]
