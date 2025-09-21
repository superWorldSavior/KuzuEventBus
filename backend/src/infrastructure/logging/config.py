<<<<<<< Updated upstream
"""
Centralized logging configuration using Loguru.

Simple, elegant logging setup for Kuzu Event Bus.
"""
import os
import sys
from pathlib import Path
from loguru import logger


def setup_logging(environment: str = "development") -> None:
    """Configure Loguru logging based on environment."""
    
    # Remove default handler
    logger.remove()
    
    # If running under pytest (collection or execution), force testing mode
    # to avoid creating file-based sinks or directories.
    if "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST") is not None:  # type: ignore[name-defined]
        environment = "testing"

    # Resolve backend/ path for file sinks (only dev/prod)
    # From config.py -> logging -> infrastructure -> src -> backend/
    backend_dir = Path(__file__).resolve().parents[3]
    logs_dir = backend_dir / "logs"
    
    if environment == "development":
        logs_dir.mkdir(exist_ok=True)
        # Development: Colorful console + detailed file logging
        logger.add(
            sys.stdout,
            level="DEBUG",
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            colorize=True
        )
        logger.add(
            str(logs_dir / "kuzu_dev.log"),
            level="DEBUG", 
            rotation="10 MB",
            retention="7 days",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            backtrace=True,
            diagnose=True
        )
        
    elif environment == "production":
        logs_dir.mkdir(exist_ok=True)
        # Production: JSON format for log aggregation
        logger.add(
            sys.stdout,
            level="INFO",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            serialize=False  # Could be True for JSON output
        )
        logger.add(
            str(logs_dir / "kuzu_prod.log"),
            level="INFO",
            rotation="50 MB", 
            retention="30 days",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            backtrace=False,
            diagnose=False
        )
        
    elif environment == "testing":
        # Testing: Minimal logging
        logger.add(
            sys.stdout,
            level="WARNING",
            format="<level>{level: <8}</level> | {message}",
            colorize=True
        )
    
    logger.info(f"🚀 Logging configured for environment: {environment}")


def get_logger(name: str = None):
    """Get logger instance - Loguru uses a singleton so this is just for consistency."""
    if name:
        return logger.bind(module=name)
    return logger


# Create module-specific loggers
auth_logger = logger.bind(component="authentication")
api_logger = logger.bind(component="api") 
domain_logger = logger.bind(component="domain")
=======
"""
Centralized logging configuration using Loguru.

Simple, elegant logging setup for Kuzu Event Bus.
"""
import os
import sys
from pathlib import Path
from loguru import logger


def setup_logging(environment: str = "development") -> None:
    """Configure Loguru logging based on environment."""
    
    # Remove default handler
    logger.remove()
    
    # If running under pytest (collection or execution), force testing mode
    # to avoid creating file-based sinks or directories.
    if "pytest" in sys.modules or os.getenv("PYTEST_CURRENT_TEST") is not None:  # type: ignore[name-defined]
        environment = "testing"

    # Resolve backend/ path for file sinks (only dev/prod)
    backend_dir = Path(__file__).resolve().parents[4]
    logs_dir = backend_dir / "logs"
    
    if environment == "development":
        logs_dir.mkdir(exist_ok=True)
        # Development: Colorful console + detailed file logging
        logger.add(
            sys.stdout,
            level="DEBUG",
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            colorize=True
        )
        logger.add(
            str(logs_dir / "kuzu_dev.log"),
            level="DEBUG", 
            rotation="10 MB",
            retention="7 days",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            backtrace=True,
            diagnose=True
        )
        
    elif environment == "production":
        logs_dir.mkdir(exist_ok=True)
        # Production: JSON format for log aggregation
        logger.add(
            sys.stdout,
            level="INFO",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            serialize=False  # Could be True for JSON output
        )
        logger.add(
            str(logs_dir / "kuzu_prod.log"),
            level="INFO",
            rotation="50 MB", 
            retention="30 days",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            backtrace=False,
            diagnose=False
        )
        
    elif environment == "testing":
        # Testing: Minimal logging
        logger.add(
            sys.stdout,
            level="WARNING",
            format="<level>{level: <8}</level> | {message}",
            colorize=True
        )
    
    logger.info(f"🚀 Logging configured for environment: {environment}")


def get_logger(name: str = None):
    """Get logger instance - Loguru uses a singleton so this is just for consistency."""
    if name:
        return logger.bind(module=name)
    return logger


# Create module-specific loggers
auth_logger = logger.bind(component="authentication")
api_logger = logger.bind(component="api") 
domain_logger = logger.bind(component="domain")
>>>>>>> Stashed changes
infra_logger = logger.bind(component="infrastructure")