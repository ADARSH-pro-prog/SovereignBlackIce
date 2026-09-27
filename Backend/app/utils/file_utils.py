import hashlib
import os
import re
from pathlib import Path
from typing import Set

ALLOWED_EXTENSIONS: Set[str] = {".txt", ".pdf"}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize uploaded filename to prevent directory traversal and filesystem attacks.
    Only allows alphanumeric characters, dashes, underscores, and dots.
    """
    # Strip any directory path components
    basename = os.path.basename(filename)
    # Remove null bytes and strange control chars
    clean_name = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", basename)
    # Strip dangerous characters like ../ \ : * ? " < > |
    clean_name = re.sub(r'[^a-zA-Z0-9_\.\- ]', '_', clean_name).strip()
    
    # Avoid empty filenames or hidden files starting with dot
    if not clean_name or clean_name.startswith("."):
        clean_name = f"document_{clean_name}"
        
    # Cap length to prevent filesystem buffer overflows
    if len(clean_name) > 200:
        stem, ext = os.path.splitext(clean_name)
        clean_name = stem[:190] + ext
        
    return clean_name


def calculate_sha256(content: bytes) -> str:
    """Compute the SHA-256 hash digest of a byte sequence."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest().lower()


def save_file(content: bytes, destination_path: Path) -> int:
    """Save bytes to the specified path, creating parents if needed."""
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_bytes(content)
    return len(content)


def get_file_extension(filename: str) -> str:
    """Return lowercase file extension with leading dot."""
    return Path(filename).suffix.lower()
