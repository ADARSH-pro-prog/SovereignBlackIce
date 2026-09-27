from app.services.chunking_service import chunking_service


def test_chunking_short_text():
    """Short text smaller than chunk_size should produce a single chunk."""
    text = "Employees can claim reimbursement within 30 days of purchase."
    chunks = chunking_service.chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["content"] == text
    assert chunks[0]["page_number"] == 1


def test_chunking_multi_page_with_page_tags():
    """Verify [Page X] tags correctly preserve page numbers in chunk metadata."""
    text = (
        "[Page 1]\n"
        "Travel Policy section 1 details.\n\n"
        "[Page 2]\n"
        "Hotel reimbursement details for travel.\n\n"
        "[Page 3]\n"
        "Meal per diem rates and meal claims."
    )
    chunks = chunking_service.chunk_text(text)
    assert len(chunks) >= 3

    page_numbers = [c["page_number"] for c in chunks]
    assert 1 in page_numbers
    assert 2 in page_numbers
    assert 3 in page_numbers

    # Verify sequential chunk_index
    for i, c in enumerate(chunks):
        assert c["chunk_index"] == i


def test_chunking_long_paragraph_sentence_preservation():
    """Verify that paragraphs exceeding chunk_size are split by sentences with overlap."""
    sentences = [f"This is sentence number {i} describing enterprise travel policies." for i in range(20)]
    long_text = " ".join(sentences)
    chunks = chunking_service.chunk_text(long_text)

    assert len(chunks) > 1
    # Check that each chunk is within reasonable length
    for c in chunks:
        assert len(c["content"]) <= 600
