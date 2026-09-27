import logging
import sys
from pathlib import Path


def setup_logging(debug: bool = True) -> logging.Logger:
    """Configures application-wide structured logging."""
    log_level = logging.DEBUG if debug else logging.INFO
    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    # Suppress verbose third-party loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logger = logging.getLogger("sovereign_black_ice")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()
