"""Preserve Word paragraph/table order; citations use sections, not printed pages."""
from pathlib import Path

from app.parsers.base import ExtractedTable, PageSegment, ParseError

_PAGE_CHAR_BUDGET = 1800


def parse(path: Path) -> list[PageSegment]:
    from docx import Document
    from docx.table import Table

    try:
        doc = Document(path)
        segments = []
        texts, tables = [], []
        size = 0
        for block in doc.iter_inner_content():
            table = None
            if isinstance(block, Table):
                rows = [[cell.text.strip() for cell in row.cells] for row in block.rows]
                if not any(any(row) for row in rows):
                    continue
                table = ExtractedTable(rows)
                text = table.as_text()
            else:
                text = block.text.strip()
            if not text:
                continue
            if texts and size + len(text) > _PAGE_CHAR_BUDGET:
                number = len(segments) + 1
                segments.append(PageSegment(number, "\n\n".join(texts), f"Section {number}", tables))
                texts, tables, size = [], [], 0
            if table:
                table.title = f"Table {len(tables) + 1}"
                text = table.as_text()
                tables.append(table)
            texts.append(text)
            size += len(text)
        if texts:
            number = len(segments) + 1
            segments.append(PageSegment(number, "\n\n".join(texts), f"Section {number}", tables))
    except Exception as exc:
        raise ParseError(f"Could not read Word document: {exc}") from exc
    if not segments:
        raise ParseError("Word document contains no extractable text.")
    return segments
