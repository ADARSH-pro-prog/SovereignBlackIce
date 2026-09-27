import hashlib
from typing import Tuple


class HashingService:
    """Provides cryptographic hashing and version comparison functions."""

    @staticmethod
    def hash_bytes(content: bytes) -> str:
        """Returns the hex SHA-256 checksum of raw file bytes."""
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest().lower()

    @staticmethod
    def compare_hashes(hash1: str, hash2: str) -> bool:
        """Determines if two SHA-256 checksums match."""
        return hash1.strip().lower() == hash2.strip().lower()


hashing_service = HashingService()
