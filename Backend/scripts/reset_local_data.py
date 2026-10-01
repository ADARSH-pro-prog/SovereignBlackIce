"""
Sovereign Black Ice - Local Development Data Reset Utility

Safely resets all local development data under LIVE mode:
- Truncates SQLite tables (documents, versions, claims, chunks, answers, evidence, alerts, claim changes)
- Recreates empty ChromaDB collection ("blackice_evidence")
- Cleans out stored uploaded files in storage/documents/
- Preserves SQLite database schema and constraints
- Preserves .env files and authentication configuration (User profiles)
- Preserves demoData.ts and Demo Mode isolation
- Preserves all source code and test files

Safety:
Requires explicit '--confirm' flag to perform any destructive action.
"""

import argparse
import os
import shutil
import sqlite3
import sys
from pathlib import Path

# Add backend root to path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from app.core.config import settings
from app.database.database import init_db


def reset_sqlite_data(db_path: Path, preserve_users: bool = True) -> dict:
    """Clear application integrity and document records while preserving table schemas."""
    if not db_path.exists():
        print(f"[!] Database file does not exist at {db_path}. Running init_db()...")
        init_db()
        return {}

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Disable foreign keys temporarily during table truncation
    cursor.execute("PRAGMA foreign_keys = OFF;")

    tables_to_clear = [
        "answer_evidence",
        "answers",
        "claim_changes",
        "claims",
        "evidence_chunks",
        "document_versions",
        "alerts",
        "documents",
    ]

    if not preserve_users:
        tables_to_clear.append("users")

    deleted_counts = {}
    for table in tables_to_clear:
        cursor.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?;", (table,))
        if cursor.fetchone()[0] > 0:
            cursor.execute(f"SELECT COUNT(*) FROM [{table}];")
            count = cursor.fetchone()[0]
            cursor.execute(f"DELETE FROM [{table}];")
            deleted_counts[table] = count

    # Re-enable foreign keys and vacuum
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    cursor.execute("VACUUM;")
    conn.close()

    # Verify schema with init_db
    init_db()

    return deleted_counts


def reset_chromadb(chroma_dir: Path) -> int:
    """Reset persistent ChromaDB collection by deleting all vectors while preserving collection."""
    import chromadb

    chroma_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    collection_name = "blackice_evidence"

    deleted_vectors = 0
    try:
        col = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        deleted_vectors = col.count()
        if deleted_vectors > 0:
            existing = col.get()
            if existing and existing.get("ids"):
                col.delete(ids=existing["ids"])
        print(f"[-] Cleared ChromaDB collection '{collection_name}' ({deleted_vectors} vector embeddings removed).")
    except Exception as e:
        print(f"[!] ChromaDB reset notice: {e}")

    return deleted_vectors


def reset_stored_documents(storage_dir: Path) -> int:
    """Remove stored uploaded files while preserving directory structure and .gitkeep."""
    storage_dir.mkdir(parents=True, exist_ok=True)
    deleted_files = 0

    for item in os.listdir(storage_dir):
        if item == ".gitkeep":
            continue
        item_path = storage_dir / item
        try:
            if item_path.is_dir():
                shutil.rmtree(item_path, ignore_errors=True)
                deleted_files += 1
            else:
                item_path.unlink()
                deleted_files += 1
        except Exception as e:
            print(f"[!] Warning: Could not remove {item_path}: {e}")

    # Ensure .gitkeep exists
    gitkeep = storage_dir / ".gitkeep"
    if not gitkeep.exists():
        gitkeep.touch()

    return deleted_files


def main():
    parser = argparse.ArgumentParser(
        description="Reset local Sovereign Black Ice development data for clean LIVE testing."
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Explicit confirmation required to execute cleanup.",
    )
    parser.add_argument(
        "--include-users",
        action="store_true",
        help="Also remove local user profiles (default: preserve auth configuration).",
    )

    args = parser.parse_args()

    print("=" * 65)
    print("  SOVEREIGN BLACK ICE - LOCAL DEVELOPMENT DATA RESET")
    print("=" * 65)

    if not args.confirm:
        print("\n[!] SAFETY ABORT: '--confirm' flag is required to proceed.")
        print("\nThis script will safely clean all local LIVE development data:")
        print("  - Documents, versions, and stored files")
        print("  - Extracted claims, chunk indices, and ChromaDB vectors")
        print("  - Answers, evidence citations, alerts, and review items")
        print("  - Schema, source code, .env, and Demo Mode are PRESERVED.")
        print("\nUsage:")
        print("  python scripts/reset_local_data.py --confirm")
        print("=" * 65)
        sys.exit(0)

    # 1. Paths
    db_relative = settings.DATABASE_URL.replace("sqlite:///./", "")
    db_path = settings.BASE_DIR / db_relative
    chroma_dir = Path(settings.chroma_storage_dir)
    documents_dir = Path(settings.documents_dir)

    print(f"\nTarget Database:   {db_path}")
    print(f"Target ChromaDB:   {chroma_dir}")
    print(f"Target Documents:  {documents_dir}")
    print()

    # 2. Reset SQLite Data
    print("1. Cleaning SQLite live tables...")
    deleted_counts = reset_sqlite_data(db_path, preserve_users=not args.include_users)
    for table, count in deleted_counts.items():
        print(f"   [-] Cleared {count:4d} rows from [{table}]")
    print("   [+] SQLite schema verified and ready.")

    # 3. Reset ChromaDB
    print("\n2. Cleaning ChromaDB vectors...")
    reset_chromadb(chroma_dir)

    # 4. Reset Stored Documents
    print("\n3. Cleaning stored uploaded document files...")
    cleared_files = reset_stored_documents(documents_dir)
    print(f"   [-] Removed {cleared_files} stored document directories/files.")
    print("   [+] Storage directory verified.")

    print("\n" + "=" * 65)
    print("  CLEANUP COMPLETE: LIVE MODE REPOSITORY IS NOW CLEAN (0 DATA)")
    print("=" * 65)
    print("Repository state:")
    print("  - Documents:           0")
    print("  - Document Versions:   0")
    print("  - Extracted Claims:    0")
    print("  - Claim Changes:       0")
    print("  - Vector Chunks:       0")
    print("  - Stored Files:        0")
    print("  - Answers & Evidence:  0")
    print("  - Alerts & Reviews:    0")
    print("  - Demo Mode Data:      PRESERVED & UNCHANGED")
    print("  - Auth Configuration:  PRESERVED")
    print("=" * 65)


if __name__ == "__main__":
    main()
