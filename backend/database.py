"""Database configuration and session management."""
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect, event
from sqlalchemy.engine import Engine
from typing import Generator
from backend.config import settings
from backend.utils.logger import logger
from backend.models import (
    Employee, Attendance, WeeklyCompliance, 
    MonthlyCompliance, QuarterlyCompliance
)

# Create engine with connection pooling for better performance
# For SQLite, we use check_same_thread=False for FastAPI compatibility
engine_kwargs = {
    "echo": settings.DEBUG,
    "connect_args": {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
}

# For PostgreSQL, add connection pooling
if "postgresql" in settings.DATABASE_URL.lower():
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,  # Verify connections before using
    })

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)


# Add query logging in debug mode
if settings.DEBUG:
    @event.listens_for(Engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        logger.debug(f"Executing query: {statement[:100]}...")


def create_db_and_tables():
    """Creates database tables from SQLModel metadata."""
    try:
        # Check for old schema version
        inspector = inspect(engine)
        if inspector.has_table("employee"):
            with engine.connect() as conn:
                columns = [col['name'] for col in inspector.get_columns('employee')]
                # Migrate from is_active to status column
                if 'is_active' in columns and 'status' not in columns:
                    logger.info("Migrating employee table from is_active to status")
                    conn.execute(text("DROP TABLE IF EXISTS employee"))
                    conn.commit()
        
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}", exc_info=True)
        raise


# Dependency for FastAPI
def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency for database session with proper error handling."""
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error: {str(e)}", exc_info=True)
        raise
    finally:
        session.close()
