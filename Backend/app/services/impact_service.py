import re
from typing import List, Dict, Any, Optional, Set
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.logging_config import logger
from app.core.exceptions import DocumentNotFoundError, VersionNotFoundError
from app.database.models import Document, DocumentVersion, Answer, AnswerEvidence, ClaimChange, Alert
from app.repositories.document_repository import document_repository
from app.repositories.claim_repository import claim_repository
from app.repositories.answer_repository import answer_repository
from app.repositories.alert_repository import alert_repository
from app.services.graph_service import graph_service
from app.services.claim_comparison_service import claim_comparison_service
from app.database.schemas import (
    ImpactAnalysisResult,
    AnswerResponse,
    AnswerEvidenceResponse,
    AlertResponse,
)


class ImpactService:
    """
    Analyzes document version changes against historical answers using the NetworkX dependency graph.
    Pinpoints directly affected answers, updates their status to 'potentially_outdated',
    generates granular alerts, and preserves unaffected answers as 'current'.
    """

    def analyze_version_impact(
        self,
        db: Session,
        document_id: str,
        old_version_id: Optional[str] = None,
        new_version_id: Optional[str] = None,
    ) -> ImpactAnalysisResult:
        """
        Executes impact analysis:
        1. Identifies claim diffs (modified, removed, uncertain).
        2. Builds and traverses NetworkX graph to trace affected answers.
        3. Flags affected answers as 'potentially_outdated' with review notes.
        4. Generates Alert records linking changed claims to affected answers.
        5. Preserves unaffected answers as 'current'.
        """
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        # 1. Resolve new_version
        if new_version_id:
            new_ver = document_repository.get_version_by_id(db, document_id, new_version_id)
            if not new_ver:
                raise VersionNotFoundError(document_id, new_version_id)
        else:
            new_ver = document_repository.get_latest_version(db, document_id)
            if not new_ver:
                raise VersionNotFoundError(document_id, "latest")

        # 2. Resolve old_version
        old_ver = None
        if old_version_id:
            old_ver = document_repository.get_version_by_id(db, document_id, old_version_id)
            if not old_ver:
                raise VersionNotFoundError(document_id, old_version_id)
        else:
            all_versions = document_repository.list_versions_by_document(db, document_id)
            older = [v for v in all_versions if v.version_number < new_ver.version_number]
            if older:
                older.sort(key=lambda v: v.version_number, reverse=True)
                old_ver = older[0]

        # 3. Ensure claim changes are computed
        changes = claim_repository.get_changes_between_versions(
            db, document_id, old_ver.id if old_ver else None, new_ver.id
        )
        if not changes and old_ver:
            # Run comparison to generate changes
            claim_comparison_service.compare_versions(
                db, document_id, old_version_id=old_ver.id, new_version_id=new_ver.id, save_changes=True
            )
            changes = claim_repository.get_changes_between_versions(
                db, document_id, old_ver.id, new_ver.id
            )

        # 4. Build NetworkX dependency graph
        G = graph_service.build_graph(db, document_id=document_id)

        # 5. Identify impactful changes: modified, removed, or uncertain
        impactful_changes: List[ClaimChange] = [
            c for c in changes if c.change_type in ["modified", "removed", "uncertain"]
        ]

        affected_answer_ids: Set[str] = set()
        impact_reasons: Dict[str, List[str]] = {}
        change_by_answer: Dict[str, ClaimChange] = {}

        for ch in impactful_changes:
            # Fetch old claim if available
            old_claim = claim_repository.get_claim_by_id(db, ch.old_claim_id) if ch.old_claim_id else None
            subj = old_claim.subject if old_claim else None

            # Trace through NetworkX graph
            ans_ids = set()
            if ch.old_claim_id:
                ans_ids.update(
                    graph_service.find_affected_answer_ids(
                        G,
                        claim_id=ch.old_claim_id,
                        claim_subject=subj,
                        old_version_id=old_ver.id if old_ver else None,
                    )
                )

            # Direct evidence check: AnswerEvidence explicitly pointing to old_claim or old_version + subject
            if ch.old_claim_id:
                direct_stmt = (
                    select(AnswerEvidence.answer_id)
                    .where(AnswerEvidence.claim_id == ch.old_claim_id)
                )
                direct_ids = set(db.execute(direct_stmt).scalars().all())
                ans_ids.update(direct_ids)

            # Check answers grounded on old_version that contain the changed claim's subject/value
            if old_ver and subj:
                ver_answers = answer_repository.get_answers_for_version(db, old_ver.id)
                clean_subj = subj.lower()
                generic_stopwords = {"policy", "rule", "company", "corporate", "employee", "guideline", "terms", "general", "section", "deadline", "limit", "window"}
                meaningful_subj_words = [w for w in re.findall(r"\w+", clean_subj) if w not in generic_stopwords and len(w) > 3]
                
                if meaningful_subj_words or (old_claim and old_claim.value):
                    for a in ver_answers:
                        q_lower = a.question.lower()
                        # Match if all meaningful subject words are in question or specific non-trivial value is in answer
                        matched = bool(meaningful_subj_words and all(w in q_lower for w in meaningful_subj_words))
                        if not matched and old_claim and old_claim.value:
                            val_lower = old_claim.value.lower().strip()
                            val_phrase = f"{val_lower} {old_claim.unit.lower().strip()}" if old_claim.unit else val_lower
                            if val_phrase in a.generated_answer.lower():
                                matched = True
                            elif len(val_lower) >= 2 and val_lower not in {"true", "false", "none", "null", "allowed", "approved"}:
                                matched = val_lower in a.generated_answer.lower()
                        if matched:
                            ans_ids.add(a.id)

            for a_id in ans_ids:
                affected_answer_ids.add(a_id)
                reason = ch.explanation or f"Claim change ({ch.change_type})"
                impact_reasons.setdefault(a_id, []).append(reason)
                change_by_answer[a_id] = ch

        # 6. Flag affected answers and generate Alert entities
        alerts_created: List[Alert] = []
        affected_answers_list: List[Answer] = []

        for a_id in affected_answer_ids:
            ans = answer_repository.get_answer_by_id(db, a_id)
            if not ans:
                continue

            ch = change_by_answer.get(a_id)
            reasons_str = "; ".join(impact_reasons.get(a_id, []))
            review_note = f"Outdated by version {new_ver.version_number}: {reasons_str}"

            # Update status to potentially_outdated
            ans.status = "potentially_outdated"
            ans.human_review_required = True
            ans.review_notes = review_note
            db.commit()
            db.refresh(ans)
            affected_answers_list.append(ans)

            # Assign severity based on change type
            severity = "high"
            if ch and ch.change_type == "removed":
                severity = "critical"
            elif ch and ch.change_type == "uncertain":
                severity = "medium"

            explanation_text = (
                f"Answer to '{ans.question}' is potentially outdated due to updates in version {new_ver.version_number}. "
                f"Root cause: {reasons_str}"
            )

            # Create Alert record
            alert = alert_repository.create_alert(
                db=db,
                alert_type="answer_potentially_outdated",
                document_id=doc.id,
                old_version_id=old_ver.id if old_ver else None,
                new_version_id=new_ver.id,
                related_claim_id=ch.old_claim_id if ch else None,
                affected_answer_id=ans.id,
                severity=severity,
                explanation=explanation_text,
                status="unreviewed",
            )
            alerts_created.append(alert)

        # 7. Identify unaffected answers
        all_document_answers = []
        if old_ver:
            all_document_answers = answer_repository.get_answers_for_version(db, old_ver.id)

        unaffected_answers_list: List[Answer] = [
            a for a in all_document_answers if a.id not in affected_answer_ids
        ]

        logger.info(
            f"Impact Analysis complete for '{doc.name}' v{new_ver.version_number}: "
            f"{len(affected_answers_list)} affected answers flagged, "
            f"{len(unaffected_answers_list)} unaffected answers preserved, "
            f"{len(alerts_created)} alerts created."
        )

        # 8. Build response
        def format_answer_response(a: Answer) -> AnswerResponse:
            ev_items = [
                AnswerEvidenceResponse(
                    id=e.id,
                    document_id=e.document_id,
                    document_name=doc.name,
                    version_id=e.version_id,
                    version_number=old_ver.version_number if (old_ver and e.version_id == old_ver.id) else new_ver.version_number,
                    chunk_id=e.chunk_id,
                    page_number=1,
                    claim_id=e.claim_id,
                    similarity_score=e.similarity_score,
                    citation_text=e.citation_text,
                    created_at=e.created_at,
                )
                for e in a.evidence_items
            ]
            return AnswerResponse(
                id=a.id,
                question=a.question,
                generated_answer=a.generated_answer,
                model_name=a.model_name,
                status=a.status,
                human_review_required=a.human_review_required,
                review_notes=a.review_notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
                evidence_items=ev_items,
            )

        def format_alert_response(al: Alert) -> AlertResponse:
            ans = answer_repository.get_answer_by_id(db, al.affected_answer_id) if al.affected_answer_id else None
            return AlertResponse(
                id=al.id,
                alert_type=al.alert_type,
                document_id=al.document_id,
                document_name=doc.name,
                old_version_id=al.old_version_id,
                new_version_id=al.new_version_id,
                related_claim_id=al.related_claim_id,
                affected_answer_id=al.affected_answer_id,
                affected_question=ans.question if ans else None,
                severity=al.severity,
                explanation=al.explanation,
                status=al.status,
                created_at=al.created_at,
                resolved_at=al.resolved_at,
            )

        return ImpactAnalysisResult(
            document_id=doc.id,
            document_name=doc.name,
            old_version_id=old_ver.id if old_ver else None,
            new_version_id=new_ver.id,
            total_claims_analyzed=len(changes),
            changed_claims_count=len(impactful_changes),
            affected_answers_count=len(affected_answers_list),
            unaffected_answers_count=len(unaffected_answers_list),
            alerts_generated=len(alerts_created),
            affected_answers=[format_answer_response(a) for a in affected_answers_list],
            unaffected_answers=[format_answer_response(a) for a in unaffected_answers_list],
            alerts=[format_alert_response(al) for al in alerts_created],
        )


impact_service = ImpactService()
