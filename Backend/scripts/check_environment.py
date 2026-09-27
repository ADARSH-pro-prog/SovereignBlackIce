"""
Environment verification script for Sovereign Black Ice.
Checks Python runtime, dependencies, SQLite, vector store, and Ollama connectivity.
"""
import sys
import platform
from pathlib import Path

# Add backend directory to sys.path so app imports work
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))


def print_check(name: str, passed: bool, message: str = ""):
    symbol = "OK" if passed else "X "
    status_text = "PASS" if passed else "FAIL"
    print(f"[{symbol}] {name:<30} : {status_text} {('- ' + message) if message else ''}")


def main():
    print("=" * 65)
    print(" Sovereign Black Ice - Environment Diagnostic Check")
    print("=" * 65)

    # 1. Python Version
    py_ver = sys.version_info
    py_ok = (py_ver.major == 3 and py_ver.minor >= 11)
    print_check(
        "Python Version",
        py_ok,
        f"{platform.python_version()} on {platform.system()} (Requires >= 3.11)",
    )

    # 2. SQLite
    try:
        import sqlite3
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        conn.close()
        print_check("SQLite & Foreign Keys", True, f"SQLite {sqlite3.sqlite_version}")
    except Exception as e:
        print_check("SQLite & Foreign Keys", False, str(e))

    # 3. FastAPI & Uvicorn
    try:
        import fastapi
        import uvicorn
        print_check("FastAPI & Uvicorn", True, f"FastAPI {fastapi.__version__}, Uvicorn {uvicorn.__version__}")
    except Exception as e:
        print_check("FastAPI & Uvicorn", False, str(e))

    # 4. SQLAlchemy
    try:
        import sqlalchemy
        print_check("SQLAlchemy", True, f"Version {sqlalchemy.__version__}")
    except Exception as e:
        print_check("SQLAlchemy", False, str(e))

    # 5. PyMuPDF (PDF processing)
    try:
        import pymupdf
        print_check("PyMuPDF", True, f"Version {pymupdf.__version__}")
    except Exception as e:
        print_check("PyMuPDF", False, str(e))

    # 6. NetworkX
    try:
        import networkx as nx
        print_check("NetworkX", True, f"Version {nx.__version__}")
    except Exception as e:
        print_check("NetworkX", False, str(e))

    # 7. ChromaDB
    try:
        import chromadb
        client = chromadb.EphemeralClient()
        client.heartbeat()
        print_check("ChromaDB Vector Store", True, f"Version {chromadb.__version__}")
    except Exception as e:
        print_check("ChromaDB Vector Store", False, str(e))

    # 8. Storage Directories
    from app.core.config import settings
    try:
        settings.documents_dir
        settings.chroma_storage_dir
        settings.data_dir
        print_check("Storage Paths", True, f"Base: {settings.BASE_DIR}")
    except Exception as e:
        print_check("Storage Paths", False, str(e))

    # 9. Ollama Connectivity Check
    import httpx
    try:
        resp = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=1.5)
        if resp.status_code == 200:
            models = [m.get("name") for m in resp.json().get("models", [])]
            print_check("Local Ollama Server", True, f"Found models: {models or 'None'}")
        else:
            print_check("Local Ollama Server", False, f"HTTP status {resp.status_code}")
    except Exception:
        print_check(
            "Local Ollama Server",
            False,
            f"Unreachable at {settings.OLLAMA_BASE_URL} (Will run without local AI until 'ollama serve' is run)",
        )

    print("=" * 65)


if __name__ == "__main__":
    main()
