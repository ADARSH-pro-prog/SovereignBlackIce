from typing import List, Dict, Any, Optional
import chromadb
from app.core.config import settings
from app.core.logging_config import logger
from app.database.models import EvidenceChunk


class VectorStoreService:
    """
    Manages local persistent vector storage via ChromaDB.
    Handles indexing of document evidence chunks, metadata tagging,
    and similarity retrieval with version/document scoping.
    """

    COLLECTION_NAME = "blackice_evidence"

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or str(settings.chroma_storage_dir)
        self._client: Optional[chromadb.PersistentClient] = None
        self._collection = None

    @property
    def client(self) -> chromadb.PersistentClient:
        if self._client is None:
            self._client = chromadb.PersistentClient(path=self.storage_path)
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            # Create or get collection using ChromaDB's default local embedding function
            self._collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def upsert_chunks(
        self, chunks: List[EvidenceChunk], version_number: int
    ) -> int:
        """
        Embeds and stores evidence chunks in ChromaDB with metadata for exact version tracking.
        """
        if not chunks:
            return 0

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for chunk in chunks:
            ids.append(chunk.id)
            documents.append(chunk.content)
            metadatas.append(
                {
                    "chunk_id": str(chunk.id),
                    "document_id": str(chunk.document_id),
                    "version_id": str(chunk.version_id),
                    "version_number": int(version_number),
                    "chunk_index": int(chunk.chunk_index),
                    "page_number": int(chunk.page_number),
                }
            )

        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(
            f"Upserted {len(chunks)} evidence chunks into ChromaDB for version '{chunks[0].version_id}'."
        )
        return len(chunks)

    def query_similar(
        self,
        query_text: str,
        n_results: int = 4,
        document_id: Optional[str] = None,
        version_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search against stored evidence chunks.
        Supports filtering by document_id and/or version_id.
        """
        total_in_coll = self.collection.count()
        if total_in_coll == 0 or not query_text or not query_text.strip():
            return []

        # Construct filter clause
        where_filter: Optional[Dict[str, Any]] = None
        if document_id and version_id:
            where_filter = {
                "$and": [
                    {"document_id": str(document_id)},
                    {"version_id": str(version_id)},
                ]
            }
        elif document_id:
            where_filter = {"document_id": str(document_id)}
        elif version_id:
            where_filter = {"version_id": str(version_id)}

        safe_k = min(n_results, total_in_coll)
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=safe_k,
                where=where_filter,
            )
        except Exception as e:
            logger.warning(f"ChromaDB query failed with filter {where_filter}: {e}")
            # Try without filter if filter had no matches or failed
            results = self.collection.query(
                query_texts=[query_text],
                n_results=safe_k,
            )

        output: List[Dict[str, Any]] = []
        if not results or not results.get("ids") or len(results["ids"][0]) == 0:
            return output

        res_ids = results["ids"][0]
        res_docs = results["documents"][0]
        res_metas = results["metadatas"][0]
        res_dists = results.get("distances", [[]])[0]

        for idx in range(len(res_ids)):
            meta = res_metas[idx] or {}
            dist = res_dists[idx] if idx < len(res_dists) else 0.5
            # For cosine distance (0.0=identical, 2.0=opposite), normalize to similarity 0.0 - 1.0
            similarity = max(0.0, min(1.0, 1.0 - (dist / 2.0)))

            output.append(
                {
                    "chunk_id": meta.get("chunk_id", res_ids[idx]),
                    "document_id": meta.get("document_id", ""),
                    "version_id": meta.get("version_id", ""),
                    "version_number": meta.get("version_number", 1),
                    "chunk_index": meta.get("chunk_index", 0),
                    "page_number": meta.get("page_number", 1),
                    "content": res_docs[idx],
                    "similarity_score": round(similarity, 4),
                    "distance": round(dist, 4) if dist is not None else None,
                }
            )

        # Sort by highest similarity
        output.sort(key=lambda x: x["similarity_score"], reverse=True)
        return output

    def delete_version_chunks(self, version_id: str) -> None:
        """Deletes all chunks belonging to a version from ChromaDB."""
        try:
            self.collection.delete(where={"version_id": str(version_id)})
            logger.info(f"Deleted vector chunks for version '{version_id}' from ChromaDB.")
        except Exception as e:
            logger.warning(f"Failed to delete ChromaDB chunks for version '{version_id}': {e}")

    def delete_document_chunks(self, document_id: str) -> None:
        """Deletes all chunks belonging to a document from ChromaDB."""
        try:
            self.collection.delete(where={"document_id": str(document_id)})
            logger.info(f"Deleted vector chunks for document '{document_id}' from ChromaDB.")
        except Exception as e:
            logger.warning(f"Failed to delete ChromaDB chunks for document '{document_id}': {e}")

    def count(self) -> int:
        """Returns total number of chunks indexed in ChromaDB."""
        return self.collection.count()


vector_store_service = VectorStoreService()
