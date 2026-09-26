"""Versioned extraction cache shared by ingestion, inspection, and comparison."""
from dataclasses import asdict
import json
from pathlib import Path
import uuid

from app.config import get_settings
from app.parsers.base import PageSegment, parse_document

VERSION = 2


def location_kind(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return "page" if ext == ".pdf" else "sheet" if ext in {".xlsx", ".xls"} else "section"


def cache_path(document_id: str) -> Path:
    return get_settings().upload_dir / f"{document_id}.extraction.json"


def save_extraction(document_id: str, filename: str, segments: list[PageSegment]) -> dict:
    result = {
        "version": VERSION, "document_id": document_id, "filename": filename,
        "location_kind": location_kind(filename), "page_count": len(segments),
        "table_count": sum(len(page.tables) for page in segments),
        "pages": [asdict(page) for page in segments],
    }
    target = cache_path(document_id)
    temporary = target.with_suffix(f".{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return result


def get_extraction(document) -> dict:
    path = get_settings().upload_dir / f"{document.id}{Path(document.filename).suffix.lower()}"
    if not path.is_file():
        raise FileNotFoundError("The original document is missing.")
    target = cache_path(document.id)
    if target.is_file() and target.stat().st_mtime_ns >= path.stat().st_mtime_ns:
        try:
            result = json.loads(target.read_text(encoding="utf-8"))
            if result.get("version") == VERSION:
                return result
        except (ValueError, OSError):
            pass
    return save_extraction(document.id, document.filename, parse_document(path, document.content_type))
