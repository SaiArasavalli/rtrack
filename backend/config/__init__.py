from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    HARDCODED_ADMIN_USERNAME: str = Field(default="admin", alias="ADMIN_USERNAME")
    HARDCODED_ADMIN_PASSWORD: str = Field(default="password", alias="ADMIN_PASSWORD")
    HARDCODED_ADMIN_EMPLOYEE_ID: str = Field(default="ADMIN", alias="ADMIN_EMPLOYEE_ID")
    
    DATABASE_URL: str = "sqlite:///./employees.db"
    
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    
    APP_NAME: str = "rTrack API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60
    
    LOG_LEVEL: str = "INFO"
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        if isinstance(v, list):
            return v
        return v
    
    @property
    def allowed_origins_list(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, list):
            return self.ALLOWED_ORIGINS
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',') if origin.strip()]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        populate_by_name=True,
    )


settings = Settings()

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
HARDCODED_ADMIN_USERNAME = settings.HARDCODED_ADMIN_USERNAME
HARDCODED_ADMIN_PASSWORD = settings.HARDCODED_ADMIN_PASSWORD
HARDCODED_ADMIN_EMPLOYEE_ID = settings.HARDCODED_ADMIN_EMPLOYEE_ID
DATABASE_URL = settings.DATABASE_URL
ALLOWED_ORIGINS = settings.allowed_origins_list
