import re
from typing import Dict, Any, List, Optional, Set
import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.logging_config import logger
from app.database.models import (
    Document,
    DocumentVersion,
    EvidenceChunk,
    Claim,
    ClaimChange,
    Answer,
    AnswerEvidence,
)
from app.database.schemas import (
    GraphNode,
    GraphEdge,
    DependencyGraphResponse,
)


class GraphService:
    """
    Constructs and manages the NetworkX directed dependency graph for Sovereign Black Ice.
    Models relationships across Documents -> Versions -> Chunks/Claims -> AI Answers,
    and supports directional reachability tracing from modified claims to answers.
    """

    def build_graph(
        self, db: Session, document_id: Optional[str] = None
    ) -> nx.DiGraph:
        """
        Builds a directed NetworkX graph of entities and dependencies.
        Nodes: Document, Version, Chunk, Claim, Answer, ClaimChange.
        Edges: HAS_VERSION, CONTAINS_CHUNK, CONTAINS_CLAIM, GROUNDS, MODIFIES.
        """
        G = nx.DiGraph()

        # 1. Fetch Documents
        doc_stmt = select(Document)
        if document_id:
            doc_stmt = doc_stmt.where(Document.id == document_id)
        documents = list(db.execute(doc_stmt).scalars().all())
        doc_ids = {d.id for d in documents}

        for d in documents:
            node_id = f"doc:{d.id}"
            G.add_node(
                node_id,
                entity_type="document",
                label=d.name,
                raw_id=d.id,
                metadata={"name": d.name, "created_at": d.created_at.isoformat()},
            )

        # 2. Fetch Versions
        ver_stmt = select(DocumentVersion)
        if document_id:
            ver_stmt = ver_stmt.where(DocumentVersion.document_id == document_id)
        versions = list(db.execute(ver_stmt).scalars().all())
        ver_ids = {v.id for v in versions}

        for v in versions:
            ver_node_id = f"ver:{v.id}"
            G.add_node(
                ver_node_id,
                entity_type="version",
                label=f"{v.file_name} v{v.version_number}",
                raw_id=v.id,
                metadata={
                    "version_number": v.version_number,
                    "document_id": v.document_id,
                    "file_hash": v.file_hash[:10],
                },
            )
            # Edge: Document -> HAS_VERSION -> Version
            doc_node_id = f"doc:{v.document_id}"
            if doc_node_id in G:
                G.add_edge(doc_node_id, ver_node_id, relation="HAS_VERSION", weight=1.0)

        # 3. Fetch Evidence Chunks
        chunk_stmt = select(EvidenceChunk)
        if document_id:
            chunk_stmt = chunk_stmt.where(EvidenceChunk.document_id == document_id)
        chunks = list(db.execute(chunk_stmt).scalars().all())

        for c in chunks:
            chunk_node_id = f"chunk:{c.id}"
            G.add_node(
                chunk_node_id,
                entity_type="chunk",
                label=f"Chunk {c.chunk_index} (p.{c.page_number})",
                raw_id=c.id,
                metadata={
                    "chunk_index": c.chunk_index,
                    "page_number": c.page_number,
                    "version_id": c.version_id,
                    "content_preview": c.content[:80],
                },
            )
            # Edge: Version -> CONTAINS_CHUNK -> Chunk
            ver_node_id = f"ver:{c.version_id}"
            if ver_node_id in G:
                G.add_edge(ver_node_id, chunk_node_id, relation="CONTAINS_CHUNK", weight=1.0)

        # 4. Fetch Claims
        claim_stmt = select(Claim)
        if document_id:
            claim_stmt = claim_stmt.where(Claim.document_id == document_id)
        claims = list(db.execute(claim_stmt).scalars().all())

        for cl in claims:
            claim_node_id = f"claim:{cl.id}"
            G.add_node(
                claim_node_id,
                entity_type="claim",
                label=f"{cl.subject or 'Rule'}: {cl.value or cl.claim_text[:30]}",
                raw_id=cl.id,
                metadata={
                    "subject": cl.subject,
                    "predicate": cl.predicate,
                    "value": cl.value,
                    "unit": cl.unit,
                    "category": cl.category,
                    "source_location": cl.source_location,
                },
            )
            # Edge: Version -> CONTAINS_CLAIM -> Claim
            ver_node_id = f"ver:{cl.version_id}"
            if ver_node_id in G:
                G.add_edge(ver_node_id, claim_node_id, relation="CONTAINS_CLAIM", weight=1.0)

        # 5. Fetch Answers & Evidence
        ans_stmt = select(Answer)
        answers = list(db.execute(ans_stmt).scalars().all())

        ev_stmt = select(AnswerEvidence)
        if document_id:
            ev_stmt = ev_stmt.where(AnswerEvidence.document_id == document_id)
        evidence_records = list(db.execute(ev_stmt).scalars().all())

        # Track which answers touch our documents/versions
        relevant_answer_ids = {e.answer_id for e in evidence_records}

        for a in answers:
            if document_id and a.id not in relevant_answer_ids:
                continue

            ans_node_id = f"answer:{a.id}"
            G.add_node(
                ans_node_id,
                entity_type="answer",
                label=f"Q: {a.question[:35]}...",
                raw_id=a.id,
                metadata={
                    "question": a.question,
                    "status": a.status,
                    "model_name": a.model_name,
                    "human_review_required": a.human_review_required,
                },
            )

        # Edges from Evidence to Answers
        for ev in evidence_records:
            ans_node_id = f"answer:{ev.answer_id}"
            if ans_node_id not in G:
                continue

            # Edge from Claim to Answer
            if ev.claim_id:
                claim_node_id = f"claim:{ev.claim_id}"
                if claim_node_id in G:
                    G.add_edge(
                        claim_node_id,
                        ans_node_id,
                        relation="GROUNDS",
                        similarity_score=ev.similarity_score or 1.0,
                    )

            # Edge from Chunk to Answer
            if ev.chunk_id:
                chunk_node_id = f"chunk:{ev.chunk_id}"
                if chunk_node_id in G:
                    G.add_edge(
                        chunk_node_id,
                        ans_node_id,
                        relation="GROUNDS",
                        similarity_score=ev.similarity_score or 1.0,
                    )

            # Edge from Version to Answer
            if ev.version_id:
                ver_node_id = f"ver:{ev.version_id}"
                if ver_node_id in G:
                    G.add_edge(
                        ver_node_id,
                        ans_node_id,
                        relation="GROUNDS",
                        similarity_score=ev.similarity_score or 1.0,
                    )

        # 6. Fetch Claim Changes
        ch_stmt = select(ClaimChange)
        if document_id:
            ch_stmt = ch_stmt.where(ClaimChange.document_id == document_id)
        changes = list(db.execute(ch_stmt).scalars().all())

        for ch in changes:
            ch_node_id = f"change:{ch.id}"
            G.add_node(
                ch_node_id,
                entity_type="change",
                label=f"Diff: {ch.change_type.upper()}",
                raw_id=ch.id,
                metadata={
                    "change_type": ch.change_type,
                    "changed_field": ch.changed_field,
                    "explanation": ch.explanation,
                    "confidence": ch.confidence,
                },
            )
            # Edge: Change -> MODIFIES -> Old Claim
            if ch.old_claim_id:
                old_claim_node = f"claim:{ch.old_claim_id}"
                if old_claim_node in G:
                    G.add_edge(ch_node_id, old_claim_node, relation="MODIFIES", weight=1.0)

            # Edge: Change -> RESULTS_IN -> New Claim
            if ch.new_claim_id:
                new_claim_node = f"claim:{ch.new_claim_id}"
                if new_claim_node in G:
                    G.add_edge(ch_node_id, new_claim_node, relation="RESULTS_IN", weight=1.0)

        logger.info(
            f"Built NetworkX dependency graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges."
        )
        return G

    def get_graph_data(
        self, db: Session, document_id: Optional[str] = None
    ) -> DependencyGraphResponse:
        """Serializes the NetworkX graph for API clients and frontend visualization."""
        G = self.build_graph(db, document_id=document_id)

        nodes: List[GraphNode] = []
        counts: Dict[str, int] = {}

        for node_id, data in G.nodes(data=True):
            ent_type = data.get("entity_type", "unknown")
            counts[ent_type] = counts.get(ent_type, 0) + 1
            nodes.append(
                GraphNode(
                    id=node_id,
                    type=ent_type,
                    label=data.get("label", node_id),
                    metadata=data.get("metadata", {}),
                )
            )

        edges: List[GraphEdge] = []
        for u, v, data in G.edges(data=True):
            edges.append(
                GraphEdge(
                    source=u,
                    target=v,
                    relation=data.get("relation", "DEPENDS_ON"),
                    weight=float(data.get("weight", 1.0)),
                )
            )

        return DependencyGraphResponse(
            total_nodes=len(nodes),
            total_edges=len(edges),
            node_counts_by_type=counts,
            nodes=nodes,
            edges=edges,
        )

    def find_affected_answer_ids(
        self,
        G: nx.DiGraph,
        claim_id: str,
        claim_subject: Optional[str] = None,
        old_version_id: Optional[str] = None,
    ) -> Set[str]:
        """
        Traces downstream dependencies from a modified claim to identify all affected Answer IDs.
        Uses graph reachability from the claim node, plus check for semantic overlap with subject.
        """
        affected_answer_ids: Set[str] = set()
        claim_node = f"claim:{claim_id}"

        # 1. Direct and indirect descendants in the directed graph
        if claim_node in G:
            descendants = nx.descendants(G, claim_node)
            for d in descendants:
                if d.startswith("answer:"):
                    affected_answer_ids.add(G.nodes[d].get("raw_id", d.replace("answer:", "")))

        # 2. Check answers connected to chunks on the same version that mention the subject
        if claim_subject:
            clean_sub = claim_subject.lower().strip()
            generic_stopwords = {"policy", "rule", "company", "corporate", "employee", "guideline", "terms", "general", "section"}
            meaningful_words = [w for w in re.findall(r"\w+", clean_sub) if w not in generic_stopwords and len(w) > 3]

            if meaningful_words:
                for n, data in G.nodes(data=True):
                    if n.startswith("answer:"):
                        q = data.get("metadata", {}).get("question", "").lower()
                        if all(w in q for w in meaningful_words):
                            ans_id = data.get("raw_id", n.replace("answer:", ""))
                            # Verify this answer was grounded on the old version
                            if old_version_id:
                                ver_node = f"ver:{old_version_id}"
                                if G.has_edge(ver_node, n):
                                    affected_answer_ids.add(ans_id)
                            else:
                                affected_answer_ids.add(ans_id)

        return affected_answer_ids


graph_service = GraphService()
