from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session
import chromadb
from app.core.config import Settings, settings
from app.api.dependencies import get_db, get_current_settings
from app.database.schemas import (
    HealthResponse,
    SystemStatusResponse,
    ServiceComponentStatus,
    ConfiguredModels,
)
from app import __version__

router = APIRouter(tags=["Health & System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Basic health check",
    description="Returns the active health status and version of Sovereign Black Ice.",
)
def get_health(cfg: Settings = Depends(get_current_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=cfg.APP_NAME,
        version=__version__,
        timestamp=datetime.now(timezone.utc),
    )


@router.get(
    "/system/status",
    response_model=SystemStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Comprehensive system status",
    description="Inspects database, local ChromaDB vector store, and local Ollama connectivity.",
)
async def get_system_status(
    db: Session = Depends(get_db),
    cfg: Settings = Depends(get_current_settings),
) -> SystemStatusResponse:
    # 1. Database Check
    try:
        db.execute(text("SELECT 1"))
        db_status = ServiceComponentStatus(
            status="connected",
            message="SQLite database is accessible with foreign key and WAL support.",
            details={"database_url": "sqlite:///./data/database.db"},
        )
    except Exception as e:
        db_status = ServiceComponentStatus(
            status="error",
            message=f"Database check failed: {str(e)}",
        )

    # 2. ChromaDB Check
    try:
        chroma_path = str(cfg.chroma_storage_dir)
        client = chromadb.PersistentClient(path=chroma_path)
        client.heartbeat()
        chroma_status = ServiceComponentStatus(
            status="connected",
            message="Local ChromaDB vector storage is initialized and ready.",
            details={"storage_path": chroma_path},
        )
    except Exception as e:
        chroma_status = ServiceComponentStatus(
            status="error",
            message=f"ChromaDB initialization failed: {str(e)}",
        )

    # 3. Ollama Connectivity Check
    ollama_models = []
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{cfg.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                ollama_models = [m.get("name") for m in data.get("models", [])]
                ollama_status = ServiceComponentStatus(
                    status="connected",
                    message="Local Ollama service is running.",
                    details={"installed_models": ollama_models},
                )
            else:
                ollama_status = ServiceComponentStatus(
                    status="warning",
                    message=f"Ollama returned HTTP status {resp.status_code}",
                )
    except Exception:
        ollama_status = ServiceComponentStatus(
            status="disconnected",
            message="Local Ollama is currently unreachable. Start it with 'ollama serve' for AI reasoning.",
            details={"target_url": cfg.OLLAMA_BASE_URL},
        )

    # Overall Status Evaluation
    overall_status = "ok"
    if db_status.status != "connected":
        overall_status = "degraded"
    elif ollama_status.status != "connected":
        overall_status = "running_local_without_ai"

    return SystemStatusResponse(
        app_name=cfg.APP_NAME,
        environment=cfg.APP_ENV,
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        ollama=ollama_status,
        chromadb=chroma_status,
        configured_models=ConfiguredModels(
            llm_model=cfg.OLLAMA_MODEL,
            embedding_model=cfg.EMBEDDING_MODEL,
            ollama_base_url=cfg.OLLAMA_BASE_URL,
        ),
    )
