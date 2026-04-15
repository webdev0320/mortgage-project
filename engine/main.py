"""
FastAPI Engine — PDF Explosion Service (Local Version)
------------------------------------------------------
POST /process  →  Reads PDF from local storage, converts each page to a 200 DPI
                  JPEG, classifies it, saves to local pages folder, then
                  calls back to the Node backend to persist Page records.
"""

from __future__ import annotations

import io
import logging
import os
import uuid
from typing import Any

import fitz  # PyMuPDF
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from classifier import classify_page
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("idp-engine")

app = FastAPI(title="IDP Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    blob_id: str
    storage_path: str  # Filename in storage/blobs


class PageResult(BaseModel):
    page_index: int
    s3_path: str
    ai_label: str
    confidence_score: float


@app.get("/health")
def health():
    return {"status": "ok", "service": "idp-engine"}


@app.post("/process", status_code=202)
async def process_pdf(req: ProcessRequest) -> dict[str, Any]:
    # 1. Determine local paths
    blobs_dir = os.path.join(settings.storage_root, "blobs")
    pages_dir = os.path.join(settings.storage_root, "pages", req.blob_id)
    pdf_path = os.path.join(blobs_dir, req.storage_path)

    os.makedirs(pages_dir, exist_ok=True)

    logger.info(f"Processing local file: {pdf_path}")
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail=f"File not found: {pdf_path}")

    # 2. Open with PyMuPDF and render each page at 200 DPI
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open PDF: {e}")
        
    dpi = 200
    mat = fitz.Matrix(dpi / 72, dpi / 72)

    results: list[PageResult] = []

    logger.info(f"Processing {len(doc)} pages for blob {req.blob_id}")

    for page_index in range(len(doc)):
        page = doc[page_index]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        jpeg_bytes = pix.tobytes("jpeg")

        # 3. Save JPEG to local pages folder
        page_filename = f"{page_index:04d}-{uuid.uuid4().hex[:8]}.jpg"
        page_relative_path = f"{req.blob_id}/{page_filename}"
        page_full_path = os.path.join(pages_dir, page_filename)
        
        with open(page_full_path, "wb") as f:
            f.write(jpeg_bytes)
            
        logger.info(f"  Page {page_index} → {page_full_path}")

        # 4. Classify the rendered page image
        classification = classify_page(jpeg_bytes)

        results.append(
            PageResult(
                page_index=page_index,
                s3_path=page_relative_path, # Using s3_path field for local relative path
                ai_label=classification.label,
                confidence_score=classification.confidence,
            )
        )

    doc.close()

    # 5. Callback to Node backend
    callback_url = f"{settings.backend_url}/api/blobs/{req.blob_id}/pages"
    payload = {
        "pages": [r.model_dump() for r in results],
        "status": "COMPLETED",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(callback_url, json=payload)
            resp.raise_for_status()
        logger.info(f"Callback success for blob {req.blob_id}")
    except Exception as e:
        logger.error(f"Callback failed for blob {req.blob_id}: {e}")

    return {
        "blob_id": req.blob_id,
        "pages_processed": len(results),
        "pages": [r.model_dump() for r in results],
    }
