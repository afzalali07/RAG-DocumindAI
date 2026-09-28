from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.config import get_settings
from app.core.charts import visualize
from app.db.models import Document
from app.db.session import get_db
from app.llm.registry import get_provider, configured_model_id

router = APIRouter(prefix='/api/spreadsheet', tags=['spreadsheet'])
class ChartRequest(BaseModel):
    document_id: str
    query: str = Field(min_length=1, max_length=2000)
    chart_type: Literal['bar', 'pie', 'line'] = 'bar'

@router.post('/visualize')
async def chart(req: ChartRequest, db: Session = Depends(get_db)):
    doc = db.get(Document, req.document_id)
    if not doc: raise HTTPException(404, 'Document not found.')
    if Path(doc.filename).suffix.lower() != '.xlsx': raise HTTPException(422, 'Choose an XLSX workbook.')
    if doc.status != 'ready': raise HTTPException(409, 'Wait for document processing to finish.')
    try:
        result = await visualize(get_settings().upload_dir / f'{doc.id}.xlsx', req.query.strip(), req.chart_type, get_provider(configured_model_id()))
        return dict(result, document_id=doc.id, filename=doc.filename, chart_type=req.chart_type, query=req.query)
    except ValueError as exc: raise HTTPException(422, str(exc)) from exc
    except FileNotFoundError as exc: raise HTTPException(404, 'Workbook file is unavailable.') from exc
    except Exception as exc: raise HTTPException(502, 'Chart generation failed. Check that Ollama is running and retry.') from exc
