from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app import __version__
from app.core.config import settings
from app.core.logging_config import logger
from app.core.exceptions import AppException, app_exception_handler, generic_exception_handler
from app.database.database import init_db
from app.api.routes import health, documents, claims, rag, impact


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} v{__version__} in [{settings.APP_ENV}] mode...")
    
    # Initialize SQLite database tables and local storage dirs
    try:
        init_db()
        logger.info("Storage directories and database verified.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=__version__,
    description=(
        "Local-First AI Knowledge Integrity System.\n\n"
        "Detects when documents change, identifies affected claims, and pinpoints "
        "historical AI-generated answers that may now be outdated."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
)

# CORS middleware for local frontend (React Native / Expo / Web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
if not settings.DEBUG:
    app.add_exception_handler(Exception, generic_exception_handler)


# Root route for welcome information
@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    tags=["Root"],
    summary="Root entry point",
)
def root():
    return {
        "name": settings.APP_NAME,
        "version": __version__,
        "status": "online",
        "docs_url": "/docs",
        "api_v1_prefix": "/api/v1",
        "health_check": "/health",
        "system_status": "/api/v1/system/status",
    }


# Route Registration
# Direct /health endpoint as required by Section 13
app.include_router(health.router)
# Versioned prefix /api/v1
app.include_router(health.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(claims.router, prefix="/api/v1")
app.include_router(rag.router, prefix="/api/v1")
app.include_router(impact.router, prefix="/api/v1")
