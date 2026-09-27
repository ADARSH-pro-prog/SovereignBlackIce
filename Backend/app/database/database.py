from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings
from app.core.logging_config import logger

# Ensure database directory exists
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./"):
    relative_path = db_url.replace("sqlite:///./", "")
    full_db_path = settings.BASE_DIR / relative_path
    full_db_path.parent.mkdir(parents=True, exist_ok=True)
    engine_url = f"sqlite:///{full_db_path.as_posix()}"
else:
    engine_url = db_url

# Create SQLAlchemy engine with thread safety for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in engine_url else {}
engine = create_engine(engine_url, connect_args=connect_args, echo=False)

# Enable Foreign Key constraints and WAL mode in SQLite for concurrency and integrity
if "sqlite" in engine_url:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all declarative models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency generator that provides a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables and necessary storage directories."""
    # Ensure all models are imported so Base.metadata knows about them
    import app.database.models  # noqa: F401
    
    settings.documents_dir
    settings.chroma_storage_dir
    settings.data_dir
    
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Check and add 'explanation' column to claim_changes if upgrading existing DB
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "claim_changes" in inspector.get_table_names():
            cols = [c["name"] for c in inspector.get_columns("claim_changes")]
            if "explanation" not in cols:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE claim_changes ADD COLUMN explanation TEXT;"))
                    conn.commit()
                logger.info("Added 'explanation' column to existing claim_changes table.")
    except Exception as e:
        logger.warning(f"Could not verify or alter claim_changes columns: {e}")

    logger.info("Database tables initialized successfully.")
