import re
import json
from typing import List, Dict, Any, Tuple, Optional
import httpx
from app.core.config import settings
from app.core.logging_config import logger


SYSTEM_PROMPT = """You are Sovereign Black Ice, an AI knowledge integrity engine.
Your task is to thoroughly analyze the provided document text and extract ALL verifiable claims, policy rules, numerical thresholds, deadlines, allowances, quotas, and operational requirements.

CRITICAL INSTRUCTIONS:
1. Extract EVERY distinct rule and policy mentioned across all paragraphs. If there are 3 different rules in the text, your JSON array MUST contain 3 separate objects. Do not stop after extracting only one claim.
2. Return ONLY a valid JSON array of objects. Do not include markdown formatting, backticks, or explanatory text before or after the JSON.

Each object in the array must strictly have these fields:
- "claim_text": The complete, exact factual statement or rule.
- "subject": The specific entity or topic of the claim (e.g., "Reimbursement Deadline", "Meal & Per Diem Allowance", "Annual Leave Allowance").
- "predicate": The action, condition, or relation (e.g., "must be submitted within", "is limited to", "is allocated").
- "value": The quantitative or operational threshold (e.g., "30 days", "20 days", "$50 per day").
- "unit": The unit if applicable (e.g., "days", "USD", "miles", "%"), or null if not applicable.
- "category": One of ["policy_rule", "deadline", "financial_limit", "eligibility", "general_fact"].
- "source_location": Document citation referencing where this rule appears (e.g., "Page 1, Paragraph 1" or "Section 2").
- "confidence": Float between 0.0 and 1.0 (e.g., 0.95).
"""


class ClaimExtractionService:
    """
    Extracts structured claims from document text using either a local LLM (Ollama)
    or a deterministic rule-based heuristic extractor when Ollama is unavailable.
    """

    def __init__(self, ollama_base_url: Optional[str] = None, model_name: Optional[str] = None):
        self.ollama_base_url = ollama_base_url or settings.OLLAMA_BASE_URL
        self.model_name = model_name or settings.OLLAMA_MODEL

    def extract_claims(
        self, text: str, document_name: str = "", force_heuristic: bool = False
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Main extraction dispatcher. Tries local LLM via Ollama first,
        falling back to deterministic heuristic extraction if unreachable or failed.
        Returns: (claims_list, extraction_method) where extraction_method is 'ollama_llm' or 'heuristic_fallback'.
        """
        if not text or not text.strip():
            return [], "heuristic_fallback"

        if not force_heuristic:
            try:
                llm_claims = self._extract_with_ollama(text, document_name)
                if llm_claims and len(llm_claims) > 0:
                    # Neuro-symbolic complement: check if any obvious rules from text were omitted
                    heuristic_claims = self.extract_claims_heuristically(text)
                    for h in heuristic_claims:
                        h_val = (h.get("value") or "").lower().strip()
                        h_sub = (h.get("subject") or "").lower().strip()
                        already_captured = any(
                            (h_val and h_val in (c.get("value") or "").lower())
                            or (h_sub and h_sub in (c.get("subject") or "").lower())
                            for c in llm_claims
                        )
                        if not already_captured:
                            llm_claims.append(h)
                    logger.info(f"Successfully extracted {len(llm_claims)} claims using Ollama ({self.model_name}).")
                    return llm_claims, "ollama_llm"
            except Exception as e:
                logger.warning(
                    f"Ollama claim extraction failed or unavailable ({e}). Falling back to heuristic extractor."
                )

        # Fallback to local heuristic extraction
        heuristic_claims = self.extract_claims_heuristically(text)
        logger.info(f"Extracted {len(heuristic_claims)} claims using heuristic fallback.")
        return heuristic_claims, "heuristic_fallback"

    def _extract_with_ollama(self, text: str, document_name: str = "") -> List[Dict[str, Any]]:
        """Query local Ollama instance with structured JSON prompt."""
        # Truncate text if excessively large to stay within context window
        sample_text = text[:8000]

        user_content = (
            f"Document Title: {document_name or 'Policy Document'}\n\n"
            f"Document Content:\n{sample_text}\n\n"
            "Extract all structured claims according to instructions as a JSON array."
        )

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.0,
            },
        }

        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{self.ollama_base_url}/api/chat", json=payload)
            if resp.status_code != 200:
                # Try fallback endpoint /api/generate
                gen_payload = {
                    "model": self.model_name,
                    "prompt": f"{SYSTEM_PROMPT}\n\n{user_content}",
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.0},
                }
                gen_resp = client.post(f"{self.ollama_base_url}/api/generate", json=gen_payload)
                if gen_resp.status_code != 200:
                    raise RuntimeError(f"Ollama returned HTTP {resp.status_code}")
                raw_text = gen_resp.json().get("response", "")
            else:
                raw_text = resp.json().get("message", {}).get("content", "")

        return self._parse_and_validate_json_claims(raw_text, text)

    def _parse_and_validate_json_claims(self, raw_json_str: str, original_text: str) -> List[Dict[str, Any]]:
        """Parse raw LLM output, handle markdown code blocks or wrapper objects, and validate fields."""
        if not raw_json_str:
            return []

        cleaned = raw_json_str.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to locate array bracket [ ... ]
            start = cleaned.find("[")
            end = cleaned.rfind("]")
            if start != -1 and end != -1 and end > start:
                try:
                    data = json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    return []
            else:
                # Try object with "claims" key
                start_obj = cleaned.find("{")
                end_obj = cleaned.rfind("}")
                if start_obj != -1 and end_obj != -1:
                    try:
                        data = json.loads(cleaned[start_obj : end_obj + 1])
                    except json.JSONDecodeError:
                        return []
                else:
                    return []

        claims_list = []
        if isinstance(data, list):
            claims_list = data
        elif isinstance(data, dict):
            # Check for common wrapper keys: "claims", "rules", "facts", "data"
            for key in ["claims", "rules", "facts", "data", "items"]:
                if key in data and isinstance(data[key], list):
                    claims_list = data[key]
                    break
            if not claims_list and "claim_text" in data:
                claims_list = [data]

        normalized: List[Dict[str, Any]] = []
        for item in claims_list:
            if not isinstance(item, dict):
                continue
            claim_text = item.get("claim_text") or item.get("text") or item.get("claim")
            if not claim_text or not str(claim_text).strip():
                continue

            # Ensure valid fields
            confidence = item.get("confidence", 1.0)
            try:
                confidence = float(confidence)
                confidence = max(0.0, min(1.0, confidence))
            except (ValueError, TypeError):
                confidence = 0.95

            source_loc = item.get("source_location") or "Document body"

            normalized.append(
                {
                    "claim_text": str(claim_text).strip(),
                    "subject": str(item.get("subject") or "").strip() or None,
                    "predicate": str(item.get("predicate") or "").strip() or None,
                    "value": str(item.get("value") or "").strip() or None,
                    "unit": str(item.get("unit") or "").strip() or None,
                    "category": str(item.get("category") or "policy_rule").strip(),
                    "source_location": str(source_loc).strip(),
                    "confidence": confidence,
                }
            )

        return normalized

    def extract_claims_heuristically(self, text: str) -> List[Dict[str, Any]]:
        """
        High-precision deterministic rule extractor that works completely offline.
        Detects policy rules, deadlines, numerical thresholds, per diems, and compliance conditions.
        """
        claims: List[Dict[str, Any]] = []
        seen_texts = set()

        # Parse text into page/paragraph blocks
        # Support [Page X] markers if present
        page_chunks = re.split(r"\[Page\s*(\d+)\]", text)
        sections: List[Tuple[int, str]] = []

        if len(page_chunks) > 1:
            # We had [Page X] markers
            current_page = 1
            idx = 0
            while idx < len(page_chunks):
                chunk = page_chunks[idx].strip()
                if chunk.isdigit():
                    current_page = int(chunk)
                    idx += 1
                    if idx < len(page_chunks):
                        sections.append((current_page, page_chunks[idx]))
                else:
                    if chunk:
                        sections.append((current_page, chunk))
                idx += 1
        else:
            sections.append((1, text))

        for page_num, section_text in sections:
            paragraphs = [p.strip() for p in section_text.split("\n\n") if p.strip()]
            if not paragraphs:
                paragraphs = [section_text.strip()]

            for p_idx, para in enumerate(paragraphs, start=1):
                # Clean up single line breaks within paragraphs
                clean_para = " ".join(line.strip() for line in para.split("\n") if line.strip())
                # Split into sentences
                sentences = re.split(r"(?<=[.!?])\s+", clean_para)

                for s_idx, sentence in enumerate(sentences, start=1):
                    raw_s = sentence.strip()
                    if not raw_s or len(raw_s) < 15:
                        continue

                    location_ref = f"Page {page_num}, Paragraph {p_idx}"

                    # Pattern 1: Deadlines and Time Periods
                    # e.g., "within 30 days of purchase", "within 15 calendar days"
                    deadline_match = re.search(
                        r"(?i)\b(?:within|in|after|before|up to)\s+(\d+)\s*(days|calendar days|business days|weeks|months|hours|years)\b",
                        raw_s,
                    )
                    if deadline_match:
                        val = f"{deadline_match.group(1)} {deadline_match.group(2)}"
                        unit = deadline_match.group(2)
                        subject = self._infer_subject(raw_s, default="Reimbursement / Submission Deadline")
                        predicate = "must be submitted within" if "within" in raw_s.lower() else "is set to"
                        self._add_unique_claim(
                            claims,
                            seen_texts,
                            claim_text=raw_s,
                            subject=subject,
                            predicate=predicate,
                            value=val,
                            unit=unit,
                            category="deadline",
                            source_location=location_ref,
                            confidence=0.95,
                        )
                        continue

                    # Pattern 2: Financial limits and allowances
                    # e.g., "reimbursed up to $50 per day", "limited to $75", "allowance of $500"
                    fin_match = re.search(
                        r"(?i)(?:up to|maximum of|limit of|allowance of|reimbursed at|reimbursed up to)?\s*([$€£]\s*\d+(?:\.\d+)?(?:\s*(?:per\s+(?:day|mile|month|year|item)))?)",
                        raw_s,
                    )
                    if fin_match and any(curr in fin_match.group(1) for curr in ["$", "€", "£"]):
                        val = fin_match.group(1).strip()
                        unit = "USD" if "$" in val else ("EUR" if "€" in val else "GBP")
                        subject = self._infer_subject(raw_s, default="Expense Allowance")
                        predicate = "is limited to" if "limit" in raw_s.lower() or "up to" in raw_s.lower() else "is set to"
                        self._add_unique_claim(
                            claims,
                            seen_texts,
                            claim_text=raw_s,
                            subject=subject,
                            predicate=predicate,
                            value=val,
                            unit=unit,
                            category="financial_limit",
                            source_location=location_ref,
                            confidence=0.95,
                        )
                        continue

                    # Pattern 3: Quantitative rules / quotas
                    # e.g., "receive 20 days annual leave", "work remotely up to 2 days per week"
                    quota_match = re.search(
                        r"(?i)\b(\d+)\s*(days|hours|percentage|%|miles|occurrences|occurrences per year)\b",
                        raw_s,
                    )
                    if quota_match and any(kw in raw_s.lower() for kw in ["receive", "entitled", "allow", "quota", "permit", "leave", "remote", "rate"]):
                        val = f"{quota_match.group(1)} {quota_match.group(2)}"
                        unit = quota_match.group(2)
                        subject = self._infer_subject(raw_s, default="Policy Allowance")
                        predicate = "is permitted up to" if "up to" in raw_s.lower() else "is allocated"
                        self._add_unique_claim(
                            claims,
                            seen_texts,
                            claim_text=raw_s,
                            subject=subject,
                            predicate=predicate,
                            value=val,
                            unit=unit,
                            category="policy_rule",
                            source_location=location_ref,
                            confidence=0.90,
                        )
                        continue

                    # Pattern 4: Modal compliance rules (must, shall, required, prohibited, cannot)
                    modal_match = re.search(
                        r"(?i)\b(must\s+(?:not\s+)?|shall\s+(?:not\s+)?|is\s+required\s+to|is\s+prohibited|cannot|may\s+only|requires)\b\s*(.+)",
                        raw_s,
                    )
                    if modal_match:
                        pred = modal_match.group(1).strip()
                        rest = modal_match.group(2).strip().rstrip(".")
                        subject = self._infer_subject(raw_s, default="Compliance Requirement")
                        cat = "eligibility" if "eligib" in raw_s.lower() or "approval" in raw_s.lower() else "policy_rule"
                        self._add_unique_claim(
                            claims,
                            seen_texts,
                            claim_text=raw_s,
                            subject=subject,
                            predicate=pred,
                            value=rest,
                            unit=None,
                            category=cat,
                            source_location=location_ref,
                            confidence=0.88,
                        )
                        continue

                    # Pattern 5: Sentences explicitly defining policies or rules
                    if any(kw in raw_s.lower() for kw in ["policy:", "rule:", "requirement:", "subject to"]):
                        subject = self._infer_subject(raw_s, default="General Policy Rule")
                        pred = "is subject to" if "subject to" in raw_s.lower() else "stipulates"
                        # Extract condition
                        cond = raw_s
                        if "subject to" in raw_s.lower():
                            parts = re.split(r"(?i)\bis\s+subject\s+to\b", raw_s)
                            if len(parts) > 1:
                                cond = parts[1].strip().rstrip(".")
                        self._add_unique_claim(
                            claims,
                            seen_texts,
                            claim_text=raw_s,
                            subject=subject,
                            predicate=pred,
                            value=cond,
                            unit=None,
                            category="policy_rule",
                            source_location=location_ref,
                            confidence=0.85,
                        )

        # If no specific patterns matched but text has sentences, extract primary policy sentences
        if not claims:
            for s in re.split(r"(?<=[.!?])\s+", text.strip()):
                s_clean = s.strip()
                if len(s_clean) >= 20:
                    self._add_unique_claim(
                        claims,
                        seen_texts,
                        claim_text=s_clean,
                        subject=self._infer_subject(s_clean, default="Document Statement"),
                        predicate="states",
                        value=s_clean,
                        unit=None,
                        category="general_fact",
                        source_location="Page 1, Paragraph 1",
                        confidence=0.80,
                    )

        return claims

    def _infer_subject(self, sentence: str, default: str) -> str:
        """Heuristically extracts subject entity from a sentence."""
        clean = sentence
        if clean.lower().startswith("policy:"):
            clean = clean[7:].strip()
        if clean.lower().startswith("rule:"):
            clean = clean[5:].strip()

        # Check for well-known topic keywords
        lower = clean.lower()
        if "reimbursement" in lower or "expense" in lower:
            if "deadline" in lower or "day" in lower:
                return "Reimbursement Deadline"
            return "Expense Reimbursement"
        if "remote work" in lower or "work remotely" in lower:
            return "Remote Work Policy"
        if "per diem" in lower or "meal" in lower:
            return "Meal & Per Diem Allowance"
        if "travel" in lower or "mileage" in lower or "car" in lower:
            return "Travel & Mileage Policy"
        if "annual leave" in lower or "vacation" in lower:
            return "Annual Leave Allowance"
        if "sick leave" in lower:
            return "Sick Leave Allowance"
        if "smoke" in lower or "smoking" in lower:
            return "Smoking Policy"

        # Otherwise extract leading noun phrase up to first verb
        match = re.match(r"^([A-Z][a-zA-Z0-9_\s]{2,40}?)\s+(?:must|shall|can|is|may|requires|are)", clean)
        if match:
            return match.group(1).strip()

        return default

    def _add_unique_claim(
        self,
        claims: List[Dict[str, Any]],
        seen_texts: set,
        claim_text: str,
        subject: Optional[str],
        predicate: Optional[str],
        value: Optional[str],
        unit: Optional[str],
        category: str,
        source_location: str,
        confidence: float,
    ) -> None:
        """Helper to deduplicate and append extracted claims."""
        key = claim_text.strip().lower()
        if key in seen_texts:
            return
        seen_texts.add(key)
        claims.append(
            {
                "claim_text": claim_text.strip(),
                "subject": subject.strip() if subject else None,
                "predicate": predicate.strip() if predicate else None,
                "value": value.strip() if value else None,
                "unit": unit.strip() if unit else None,
                "category": category,
                "source_location": source_location,
                "confidence": confidence,
            }
        )


claim_extraction_service = ClaimExtractionService()
