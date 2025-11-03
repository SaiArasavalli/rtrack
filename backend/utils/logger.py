"""Logging configuration."""
import logging
import sys
from typing import Optional
from backend.config import settings


def setup_logger(name: str = "rtrack", level: Optional[str] = None) -> logging.Logger:
    """Setup application logger with proper formatting."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level or settings.LOG_LEVEL, logging.INFO))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    return logger


# Create application logger
logger = setup_logger()

