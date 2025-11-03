"""Configuration settings for the backend."""
import os
from datetime import timedelta
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Hardcoded admin credentials (should be changed in production)
    HARDCODED_ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    HARDCODED_ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "password")
    HARDCODED_ADMIN_EMPLOYEE_ID: str = os.getenv("ADMIN_EMPLOYEE_ID", "ADMIN")
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./employees.db")
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    ).split(",")
    
    # Application settings
    APP_NAME: str = os.getenv("APP_NAME", "Rtrack API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Rate limiting (optional)
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "False").lower() == "true"
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Export for backward compatibility
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
HARDCODED_ADMIN_USERNAME = settings.HARDCODED_ADMIN_USERNAME
HARDCODED_ADMIN_PASSWORD = settings.HARDCODED_ADMIN_PASSWORD
HARDCODED_ADMIN_EMPLOYEE_ID = settings.HARDCODED_ADMIN_EMPLOYEE_ID
DATABASE_URL = settings.DATABASE_URL
ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS
