import re


def normalize_text(text: str) -> str:
    """
    Normalizes line endings and spaces while preserving intentional paragraph breaks.
    """
    if not text:
        return ""
    # Normalize carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace horizontal tabs with spaces
    text = text.replace("\t", " ")
    # Replace 3 or more consecutive newlines with 2 (paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip trailing/leading whitespace per line
    lines = [re.sub(r"[ ]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(lines).strip()


def preview_text(text: str, max_chars: int = 150) -> str:
    """Returns a shortened preview of text."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."
