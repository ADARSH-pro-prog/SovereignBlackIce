from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logging_config import logger


class AppException(Exception):
    """Base exception class for all Sovereign Black Ice application errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class DocumentNotFoundError(AppException):
    def __init__(self, document_id: str):
        super().__init__(
            message=f"Document with ID '{document_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DOCUMENT_NOT_FOUND",
            details={"document_id": document_id},
        )


class VersionNotFoundError(AppException):
    def __init__(self, document_id: str, version_id: str):
        super().__init__(
            message=f"Version '{version_id}' not found for document '{document_id}'.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="VERSION_NOT_FOUND",
            details={"document_id": document_id, "version_id": version_id},
        )


class DuplicateDocumentError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="DUPLICATE_DOCUMENT",
            details=details,
        )


class InvalidFileError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILE",
            details=details,
        )


class DocumentProcessingError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
        super().__init__(
            message=message,
            status_code=status_code,
            error_code="DOCUMENT_PROCESSING_FAILED",
            details=details,
        )


class OllamaUnavailableError(AppException):
    def __init__(self, message: str = "Local Ollama service is unreachable or model is not loaded."):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="OLLAMA_UNAVAILABLE",
        )


class VectorStoreError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="VECTOR_STORE_ERROR",
            details=details,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Centralized handler for all application exceptions."""
    logger.warning(
        f"Handled application exception: {exc.error_code} - {exc.message} [Path: {request.url.path}]"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unexpected unhandled errors."""
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": {},
            }
        },
    )
