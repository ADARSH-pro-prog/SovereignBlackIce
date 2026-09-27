import re
import difflib
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.core.logging_config import logger
from app.core.exceptions import DocumentNotFoundError, VersionNotFoundError
from app.database.models import Claim, ClaimChange, DocumentVersion
from app.repositories.document_repository import document_repository
from app.repositories.claim_repository import claim_repository
from app.database.schemas import (
    ClaimResponse,
    ClaimChangeDetail,
    VersionComparisonSummary,
    VersionComparisonResponse,
)

GENERIC_POLICY_WORDS = {
    "policy",
    "rule",
    "rules",
    "requirement",
    "requirements",
    "guideline",
    "guidelines",
    "standard",
    "standards",
    "procedure",
    "procedures",
    "document",
    "section",
    "statement",
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "for",
    "to",
    "of",
    "and",
    "or",
    "by",
    "with",
    "is",
    "are",
    "all",
    "any",
    "each",
    "every",
    "per",
}


def meaningful_tokens(s: Optional[str]) -> set:
    """Extracts non-stopword tokens from a text string."""
    if not s:
        return set()
    raw = set(re.findall(r"\w+", s.lower()))
    filtered = raw - GENERIC_POLICY_WORDS
    return filtered if filtered else raw


def string_similarity(s1: Optional[str], s2: Optional[str]) -> float:
    """Calculates character sequence similarity ratio (0.0 to 1.0)."""
    if not s1 or not s2:
        return 0.0
    clean1 = s1.lower().strip()
    clean2 = s2.lower().strip()
    if clean1 == clean2:
        return 1.0
    return difflib.SequenceMatcher(None, clean1, clean2).ratio()


def token_jaccard_similarity(
    s1: Optional[str], s2: Optional[str], filter_stopwords: bool = False
) -> float:
    """Calculates word token Jaccard similarity (0.0 to 1.0)."""
    if not s1 or not s2:
        return 0.0
    if filter_stopwords:
        tokens1 = meaningful_tokens(s1)
        tokens2 = meaningful_tokens(s2)
    else:
        tokens1 = set(re.findall(r"\w+", s1.lower()))
        tokens2 = set(re.findall(r"\w+", s2.lower()))

    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


class ClaimComparisonService:
    """
    Compares structured claims across document versions.
    Identifies added, removed, modified, unchanged, and uncertain claims.
    Includes exact source references and generates human-readable explanations.
    """

    def compute_claim_similarity(self, old_c: Claim, new_c: Claim) -> float:
        """
        Computes composite semantic overlap between an old claim and a new claim.
        Weighs subject similarity, predicate similarity, and overall claim text.
        Excludes generic boilerplate words from determining false matches.
        """
        # Subject meaningful token overlap
        subj_jaccard = token_jaccard_similarity(
            old_c.subject, new_c.subject, filter_stopwords=True
        )
        subj_seq = string_similarity(old_c.subject, new_c.subject)

        # If meaningful tokens have ZERO overlap, heavily discount subject similarity
        if subj_jaccard == 0.0:
            subj_sim = subj_seq * 0.25
        else:
            subj_sim = max(subj_seq, subj_jaccard)

        # Predicate similarity
        pred_seq = string_similarity(old_c.predicate, new_c.predicate)
        pred_jaccard = token_jaccard_similarity(old_c.predicate, new_c.predicate)
        pred_sim = max(pred_seq, pred_jaccard)

        # Text similarity
        text_seq = string_similarity(old_c.claim_text, new_c.claim_text)
        text_jaccard = token_jaccard_similarity(
            old_c.claim_text, new_c.claim_text, filter_stopwords=True
        )
        text_sim = max(text_seq, text_jaccard)

        if old_c.subject and new_c.subject:
            return 0.50 * subj_sim + 0.20 * pred_sim + 0.30 * text_sim
        return text_sim

    def compare_claims_lists(
        self,
        old_claims: List[Claim],
        new_claims: List[Claim],
        document_id: str,
        old_version_id: Optional[str],
        new_version_id: str,
        old_version_number: Optional[int] = None,
        new_version_number: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Compares two lists of claims and produces classified change records.
        Change types detected:
        - 'added': New claim in new version.
        - 'removed': Claim from old version no longer present.
        - 'modified': Same subject/rule with altered value, unit, or condition.
        - 'unchanged': Identical claim in both versions.
        - 'uncertain': Ambiguous semantic overlap requiring human compliance review.
        """
        changes: List[Dict[str, Any]] = []

        # If there are no old claims (e.g. Version 1 initial baseline)
        if not old_claims:
            for new_c in new_claims:
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": None,
                        "new_version_id": new_version_id,
                        "old_claim_id": None,
                        "new_claim_id": new_c.id,
                        "change_type": "added",
                        "changed_field": None,
                        "confidence": 1.0,
                        "human_review_required": False,
                        "explanation": f"Initial claim added in version {new_version_number}: '{new_c.claim_text}'",
                        "old_claim": None,
                        "new_claim": new_c,
                        "source_reference_old": None,
                        "source_reference_new": new_c.source_location,
                    }
                )
            return changes

        # Generate candidate pairs with similarity scores
        candidate_pairs: List[Tuple[float, int, int]] = []
        for o_idx, old_c in enumerate(old_claims):
            for n_idx, new_c in enumerate(new_claims):
                score = self.compute_claim_similarity(old_c, new_c)
                # Must have meaningful overlap (>= 0.40) to be a candidate
                if score >= 0.40:
                    candidate_pairs.append((score, o_idx, n_idx))

        # Greedy bipartite matching from highest similarity down
        candidate_pairs.sort(key=lambda x: x[0], reverse=True)
        matched_old: set = set()
        matched_new: set = set()
        matched_tuples: List[Tuple[float, int, int]] = []

        for score, o_idx, n_idx in candidate_pairs:
            if o_idx not in matched_old and n_idx not in matched_new:
                matched_old.add(o_idx)
                matched_new.add(n_idx)
                matched_tuples.append((score, o_idx, n_idx))

        # Classify each matched pair
        for score, o_idx, n_idx in matched_tuples:
            old_c = old_claims[o_idx]
            new_c = new_claims[n_idx]

            subj_sim = max(
                string_similarity(old_c.subject, new_c.subject),
                token_jaccard_similarity(
                    old_c.subject, new_c.subject, filter_stopwords=True
                ),
            )
            text_sim = max(
                string_similarity(old_c.claim_text, new_c.claim_text),
                token_jaccard_similarity(
                    old_c.claim_text, new_c.claim_text, filter_stopwords=True
                ),
            )

            old_val_clean = (old_c.value or "").lower().strip()
            new_val_clean = (new_c.value or "").lower().strip()
            values_equal = (old_val_clean == new_val_clean) and bool(old_val_clean)

            # Check if modal condition negated or inverted
            negation_old = any(
                w in old_c.claim_text.lower()
                for w in ["not", "prohibited", "cannot", "no longer"]
            )
            negation_new = any(
                w in new_c.claim_text.lower()
                for w in ["not", "prohibited", "cannot", "no longer"]
            )
            polarity_flipped = negation_old != negation_new

            # 1. UNCHANGED
            if values_equal and not polarity_flipped and (subj_sim >= 0.75 or text_sim >= 0.85):
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": new_c.id,
                        "change_type": "unchanged",
                        "changed_field": None,
                        "confidence": 1.0,
                        "human_review_required": False,
                        "explanation": f"Claim regarding '{new_c.subject or new_c.claim_text}' remains unchanged.",
                        "old_claim": old_c,
                        "new_claim": new_c,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": new_c.source_location,
                    }
                )

            # 2. MODIFIED (Value or direct field changed)
            elif (
                (subj_sim >= 0.65 or text_sim >= 0.65)
                and not values_equal
                and old_c.value
                and new_c.value
                and not polarity_flipped
                # Verify values share compatible concept (e.g. numeric, durations, or units)
                and (
                    old_c.unit == new_c.unit
                    or any(c.isdigit() for c in old_c.value)
                    and any(c.isdigit() for c in new_c.value)
                )
            ):
                field = "value"
                if old_c.unit != new_c.unit and old_c.unit and new_c.unit:
                    field = "value_and_unit"
                conf = round(min(1.0, 0.70 + 0.30 * max(subj_sim, text_sim)), 2)
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": new_c.id,
                        "change_type": "modified",
                        "changed_field": field,
                        "confidence": conf,
                        "human_review_required": False,
                        "explanation": (
                            f"Value for '{new_c.subject or old_c.subject}' changed from "
                            f"'{old_c.value}' to '{new_c.value}'."
                        ),
                        "old_claim": old_c,
                        "new_claim": new_c,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": new_c.source_location,
                    }
                )

            # 3. UNCERTAIN (Ambiguous, restructuring, polarity flipped, or moderate overlap)
            elif (
                (0.40 <= score < 0.70)
                or polarity_flipped
                or (subj_sim >= 0.50 and not values_equal)
            ):
                conf = round(score, 2)
                reason = "Ambiguous policy change"
                if polarity_flipped:
                    reason = "Potential negation or policy inversion detected"
                elif 0.40 <= score < 0.70:
                    reason = "Rule condition restructured with partial semantic similarity"

                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": new_c.id,
                        "change_type": "uncertain",
                        "changed_field": "policy_condition",
                        "confidence": conf,
                        "human_review_required": True,
                        "explanation": (
                            f"{reason} for '{new_c.subject or old_c.subject}'. "
                            f"Previous: '{old_c.claim_text}' -> Current: '{new_c.claim_text}'. Human review required."
                        ),
                        "old_claim": old_c,
                        "new_claim": new_c,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": new_c.source_location,
                    }
                )

            # Fallback for identical text
            elif text_sim >= 0.85:
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": new_c.id,
                        "change_type": "unchanged",
                        "changed_field": None,
                        "confidence": round(text_sim, 2),
                        "human_review_required": False,
                        "explanation": f"Claim '{new_c.claim_text}' is functionally identical.",
                        "old_claim": old_c,
                        "new_claim": new_c,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": new_c.source_location,
                    }
                )
            else:
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": new_c.id,
                        "change_type": "modified",
                        "changed_field": "claim_text",
                        "confidence": round(score, 2),
                        "human_review_required": True,
                        "explanation": f"Claim statement modified: '{old_c.claim_text}' -> '{new_c.claim_text}'",
                        "old_claim": old_c,
                        "new_claim": new_c,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": new_c.source_location,
                    }
                )

        # 4. ADDED (New claims with no match in old version)
        for n_idx, new_c in enumerate(new_claims):
            if n_idx not in matched_new:
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": None,
                        "new_claim_id": new_c.id,
                        "change_type": "added",
                        "changed_field": None,
                        "confidence": 1.0,
                        "human_review_required": False,
                        "explanation": f"New claim added in version {new_version_number}: '{new_c.claim_text}'",
                        "old_claim": None,
                        "new_claim": new_c,
                        "source_reference_old": None,
                        "source_reference_new": new_c.source_location,
                    }
                )

        # 5. REMOVED (Old claims with no counterpart in new version)
        for o_idx, old_c in enumerate(old_claims):
            if o_idx not in matched_old:
                changes.append(
                    {
                        "document_id": document_id,
                        "old_version_id": old_version_id,
                        "new_version_id": new_version_id,
                        "old_claim_id": old_c.id,
                        "new_claim_id": None,
                        "change_type": "removed",
                        "changed_field": None,
                        "confidence": 1.0,
                        "human_review_required": False,
                        "explanation": f"Claim from version {old_version_number or 'prior'} was removed: '{old_c.claim_text}'",
                        "old_claim": old_c,
                        "new_claim": None,
                        "source_reference_old": old_c.source_location,
                        "source_reference_new": None,
                    }
                )

        return changes

    def compare_versions(
        self,
        db: Session,
        document_id: str,
        old_version_id: Optional[str] = None,
        new_version_id: Optional[str] = None,
        save_changes: bool = True,
    ) -> VersionComparisonResponse:
        """
        Orchestrates full version claim comparison.
        Resolves version records, auto-extracts claims if needed, computes diff,
        persists ClaimChange rows, and returns VersionComparisonResponse.
        """
        doc = document_repository.get_document_by_id(db, document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        # Resolve new_version
        if new_version_id:
            new_ver = document_repository.get_version_by_id(db, document_id, new_version_id)
            if not new_ver:
                raise VersionNotFoundError(document_id, new_version_id)
        else:
            new_ver = document_repository.get_latest_version(db, document_id)
            if not new_ver:
                raise VersionNotFoundError(document_id, "latest")

        # Resolve old_version
        old_ver: Optional[DocumentVersion] = None
        if old_version_id:
            old_ver = document_repository.get_version_by_id(db, document_id, old_version_id)
            if not old_ver:
                raise VersionNotFoundError(document_id, old_version_id)
        else:
            # Pick predecessor version
            all_versions = document_repository.list_versions_by_document(db, document_id)
            # Filter for versions with lower version_number
            older = [v for v in all_versions if v.version_number < new_ver.version_number]
            if older:
                # Take highest version number among older
                older.sort(key=lambda v: v.version_number, reverse=True)
                old_ver = older[0]

        # Lazy auto-extract claims if not already extracted
        from app.services.claim_service import claim_service

        new_claims = claim_repository.get_claims_by_version(db, new_ver.id)
        if not new_claims:
            claim_service.extract_and_save_claims(db, document_id, new_ver.id)
            new_claims = claim_repository.get_claims_by_version(db, new_ver.id)

        old_claims: List[Claim] = []
        if old_ver:
            old_claims = claim_repository.get_claims_by_version(db, old_ver.id)
            if not old_claims:
                claim_service.extract_and_save_claims(db, document_id, old_ver.id)
                old_claims = claim_repository.get_claims_by_version(db, old_ver.id)

        # Run comparison logic
        raw_changes = self.compare_claims_lists(
            old_claims=old_claims,
            new_claims=new_claims,
            document_id=document_id,
            old_version_id=old_ver.id if old_ver else None,
            new_version_id=new_ver.id,
            old_version_number=old_ver.version_number if old_ver else None,
            new_version_number=new_ver.version_number,
        )

        # Persist changes if requested
        if save_changes:
            claim_repository.delete_changes_between_versions(
                db, document_id, old_ver.id if old_ver else None, new_ver.id
            )
            entities_to_save: List[ClaimChange] = []
            for c_data in raw_changes:
                change_entity = ClaimChange(
                    document_id=c_data["document_id"],
                    old_version_id=c_data["old_version_id"],
                    new_version_id=c_data["new_version_id"],
                    old_claim_id=c_data["old_claim_id"],
                    new_claim_id=c_data["new_claim_id"],
                    change_type=c_data["change_type"],
                    changed_field=c_data["changed_field"],
                    explanation=c_data["explanation"],
                    confidence=c_data["confidence"],
                    human_review_required=c_data["human_review_required"],
                )
                entities_to_save.append(change_entity)

            saved_entities = claim_repository.bulk_create_claim_changes(db, entities_to_save)
            # Map saved IDs back
            for idx, entity in enumerate(saved_entities):
                raw_changes[idx]["id"] = entity.id

        # Compute summary counts
        added_cnt = sum(1 for c in raw_changes if c["change_type"] == "added")
        removed_cnt = sum(1 for c in raw_changes if c["change_type"] == "removed")
        modified_cnt = sum(1 for c in raw_changes if c["change_type"] == "modified")
        unchanged_cnt = sum(1 for c in raw_changes if c["change_type"] == "unchanged")
        uncertain_cnt = sum(1 for c in raw_changes if c["change_type"] == "uncertain")
        review_cnt = sum(1 for c in raw_changes if c.get("human_review_required", False))

        summary = VersionComparisonSummary(
            total_old_claims=len(old_claims),
            total_new_claims=len(new_claims),
            added_count=added_cnt,
            removed_count=removed_cnt,
            modified_count=modified_cnt,
            unchanged_count=unchanged_cnt,
            uncertain_count=uncertain_cnt,
            requires_human_review_count=review_cnt,
        )

        detail_items: List[ClaimChangeDetail] = []
        for c in raw_changes:
            old_c_resp = ClaimResponse.model_validate(c["old_claim"]) if c["old_claim"] else None
            new_c_resp = ClaimResponse.model_validate(c["new_claim"]) if c["new_claim"] else None
            detail_items.append(
                ClaimChangeDetail(
                    id=c.get("id"),
                    change_type=c["change_type"],
                    changed_field=c.get("changed_field"),
                    confidence=c["confidence"],
                    human_review_required=c["human_review_required"],
                    explanation=c["explanation"],
                    old_claim_id=c["old_claim_id"],
                    new_claim_id=c["new_claim_id"],
                    source_reference_old=c.get("source_reference_old"),
                    source_reference_new=c.get("source_reference_new"),
                    old_claim=old_c_resp,
                    new_claim=new_c_resp,
                )
            )

        return VersionComparisonResponse(
            document_id=doc.id,
            document_name=doc.name,
            old_version_id=old_ver.id if old_ver else None,
            old_version_number=old_ver.version_number if old_ver else None,
            new_version_id=new_ver.id,
            new_version_number=new_ver.version_number,
            summary=summary,
            changes=detail_items,
        )


claim_comparison_service = ClaimComparisonService()
