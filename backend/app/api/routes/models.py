"""Supported Ollama models for diagnostics; selection is backend-only."""
from __future__ import annotations

from fastapi import APIRouter

from app.llm.registry import list_models
from app.schemas.dto import ModelInfo

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=list[ModelInfo])
def get_models():
    return list_models()
