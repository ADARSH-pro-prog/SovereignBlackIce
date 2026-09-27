from typing import List
from pydantic import BaseModel, Field
import pymupdf
from app.core.exceptions import DocumentProcessingError, InvalidFileError
from app.utils.file_utils import get_file_extension
from app.utils.text_utils import normalize_text


class ExtractedPage(BaseModel):
    """Represents text extracted from a single document page."""
    page_number: int = Field(description="1-indexed page number")
    text: str = Field(description="Extracted and normalized text")
    char_count: int = Field(description="Total character count")


class ExtractedTextResult(BaseModel):
    """Complete result of a document text extraction."""
    full_text: str = Field(description="Aggregated full document text")
    page_count: int = Field(description="Total number of pages processed")
    pages: List[ExtractedPage] = Field(description="Per-page extracted text breakdown")


class TextExtractionService:
    """Extracts readable text from supported document formats (PDF, TXT)."""

    def extract_text(self, content: bytes, filename: str) -> ExtractedTextResult:
        """Dispatcher method that identifies file type and invokes proper parser."""
        ext = get_file_extension(filename)
        if ext == ".txt":
            return self.extract_from_txt(content)
        elif ext == ".pdf":
            return self.extract_from_pdf(content)
        else:
            raise InvalidFileError(
                f"Unsupported file format '{ext}'. Sovereign Black Ice currently supports .txt and .pdf files."
            )

    def extract_from_txt(self, content: bytes) -> ExtractedTextResult:
        """Decode TXT bytes with graceful encoding fallback and paragraph preservation."""
        encodings_to_try = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]
        decoded_text = None
        used_encoding = None

        for enc in encodings_to_try:
            try:
                decoded_text = content.decode(enc)
                used_encoding = enc
                break
            except (UnicodeDecodeError, LookupError):
                continue

        if decoded_text is None:
            raise DocumentProcessingError(
                "Unable to decode text file. File must be encoded in UTF-8, Windows-1252, or Latin-1."
            )

        normalized = normalize_text(decoded_text)
        if not normalized or len(normalized.strip()) == 0:
            raise DocumentProcessingError("Text document is empty or contains only whitespace.")

        page = ExtractedPage(
            page_number=1,
            text=normalized,
            char_count=len(normalized),
        )

        return ExtractedTextResult(
            full_text=normalized,
            page_count=1,
            pages=[page],
        )

    def extract_from_pdf(self, content: bytes) -> ExtractedTextResult:
        """
        Extract text from all PDF pages using PyMuPDF.
        Detects empty, corrupted, and image-only/scanned PDFs without embedded text.
        """
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
        except Exception as e:
            raise DocumentProcessingError(f"Malformed or corrupted PDF file: {str(e)}")

        page_count = len(doc)
        if page_count == 0:
            doc.close()
            raise DocumentProcessingError("PDF file contains no pages.")

        extracted_pages: List[ExtractedPage] = []
        full_text_chunks: List[str] = []
        total_text_chars = 0

        for page_idx in range(page_count):
            try:
                page = doc.load_page(page_idx)
                raw_page_text = page.get_text()
                clean_page_text = normalize_text(raw_page_text)
                
                char_len = len(clean_page_text.strip())
                total_text_chars += char_len

                extracted_pages.append(
                    ExtractedPage(
                        page_number=page_idx + 1,
                        text=clean_page_text,
                        char_count=len(clean_page_text),
                    )
                )
                if clean_page_text:
                    full_text_chunks.append(f"[Page {page_idx + 1}]\n{clean_page_text}")
            except Exception as e:
                doc.close()
                raise DocumentProcessingError(
                    f"Error reading page {page_idx + 1} of PDF: {str(e)}"
                )

        doc.close()

        # Critical Check: Image-only or blank PDF detection
        if total_text_chars == 0:
            raise DocumentProcessingError(
                "PDF contains no readable text. It appears to be an image-only, scanned, or empty PDF. "
                "Sovereign Black Ice requires text-based PDFs to ensure knowledge integrity."
            )

        aggregated_text = "\n\n".join(full_text_chunks)

        return ExtractedTextResult(
            full_text=aggregated_text,
            page_count=page_count,
            pages=extracted_pages,
        )


text_extraction_service = TextExtractionService()
