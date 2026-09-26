"""Extract PDF text and ruled tables, retaining every physical page."""
from pathlib import Path

from app.parsers.base import ExtractedTable, PageSegment, ParseError


def parse(path: Path) -> list[PageSegment]:
    import pdfplumber

    segments = []
    try:
        with pdfplumber.open(path) as pdf:
            for number, page in enumerate(pdf.pages, 1):
                tables = []
                warnings = []
                text = (page.extract_text() or "").strip()
                try:
                    for rows in page.extract_tables():
                        cleaned = [[str(cell or "").strip() for cell in row] for row in rows]
                        if any(any(row) for row in cleaned):
                            tables.append(ExtractedTable(cleaned, f"Table {len(tables) + 1}"))
                except Exception:
                    warnings.append("Table extraction failed on this page; review the original.")
                if not text and not tables:
                    warnings.append("No extractable text. This page may be blank or need OCR.")
                content = "\n\n".join([text, *(table.as_text() for table in tables)]).strip()
                segments.append(PageSegment(number, content, f"Page {number}", tables, warnings))
    except Exception as exc:
        raise ParseError(f"Could not read PDF: {exc}") from exc
    if not any(segment.text for segment in segments):
        raise ParseError("PDF has no extractable text. Scanned documents require OCR.")
    return segments
