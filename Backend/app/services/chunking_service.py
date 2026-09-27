import re
from typing import List, Dict, Any, Tuple


class ChunkingService:
    """
    Splits document text into coherent, overlapping chunks while preserving
    page number boundaries and paragraph structures.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Parses text, handles optional [Page X] tags, and divides into indexed chunks.
        Returns list of dicts: {"chunk_index": int, "content": str, "page_number": int}
        """
        if not text or not text.strip():
            return []

        # 1. Parse into page sections if [Page X] tags are present
        page_sections = self._split_by_page_tags(text)

        chunks: List[Dict[str, Any]] = []
        chunk_index = 0

        for page_num, section_content in page_sections:
            page_chunks = self._chunk_section(section_content, page_num, chunk_index)
            chunks.extend(page_chunks)
            chunk_index += len(page_chunks)

        return chunks

    def _split_by_page_tags(self, text: str) -> List[Tuple[int, str]]:
        """Splits text by [Page X] markers, maintaining 1-indexed page numbers."""
        page_chunks = re.split(r"\[Page\s*(\d+)\]", text)
        sections: List[Tuple[int, str]] = []

        if len(page_chunks) > 1:
            current_page = 1
            idx = 0
            while idx < len(page_chunks):
                chunk = page_chunks[idx].strip()
                if chunk.isdigit():
                    current_page = int(chunk)
                    idx += 1
                    if idx < len(page_chunks):
                        sections.append((current_page, page_chunks[idx].strip()))
                else:
                    if chunk:
                        sections.append((current_page, chunk))
                idx += 1
        else:
            sections.append((1, text.strip()))

        return sections

    def _chunk_section(
        self, section_text: str, page_number: int, start_index: int
    ) -> List[Dict[str, Any]]:
        """Divides a single page or section text into overlapping chunks."""
        paragraphs = [p.strip() for p in section_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [section_text.strip()]

        result_chunks: List[Dict[str, Any]] = []
        current_chunk = ""
        current_idx = start_index

        for para in paragraphs:
            # If paragraph itself exceeds chunk_size, split by sentences
            if len(para) > self.chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    if len(current_chunk) + len(sentence) + 1 <= self.chunk_size:
                        current_chunk = f"{current_chunk} {sentence}".strip()
                    else:
                        if current_chunk:
                            result_chunks.append(
                                {
                                    "chunk_index": current_idx,
                                    "content": current_chunk,
                                    "page_number": page_number,
                                }
                            )
                            current_idx += 1
                            # Retain overlap from end of current chunk
                            overlap_text = current_chunk[-self.chunk_overlap :] if len(current_chunk) > self.chunk_overlap else ""
                            current_chunk = f"{overlap_text} {sentence}".strip()
                        else:
                            current_chunk = sentence
            else:
                if len(current_chunk) + len(para) + 2 <= self.chunk_size:
                    current_chunk = f"{current_chunk}\n\n{para}".strip()
                else:
                    if current_chunk:
                        result_chunks.append(
                            {
                                "chunk_index": current_idx,
                                "content": current_chunk,
                                "page_number": page_number,
                            }
                        )
                        current_idx += 1
                        overlap_text = current_chunk[-self.chunk_overlap :] if len(current_chunk) > self.chunk_overlap else ""
                        current_chunk = f"{overlap_text}\n\n{para}".strip()
                    else:
                        current_chunk = para

        if current_chunk:
            result_chunks.append(
                {
                    "chunk_index": current_idx,
                    "content": current_chunk,
                    "page_number": page_number,
                }
            )

        return result_chunks


chunking_service = ChunkingService()
