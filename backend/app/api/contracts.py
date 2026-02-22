import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query

from app.api.auth import get_current_user
from app.models.schemas import (
    ContractListResponse,
    ContractDetailResponse,
    ContractMetadataResponse,
    ContractResponse,
    StatusResponse,
    UploadResponse,
)
from app.services.supabase_service import supabase_service
from app.services.s3_service import s3_service
from app.services.textract_service import textract_service
from app.services.extraction_service import extraction_service
from app.services.embedding_service import EmbeddingService
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["contracts"])


async def process_contract(contract_id: str, s3_key: str, file_name: str):
    """Background task: OCR -> extraction -> embeddings."""
    try:
        # Step 1: OCR
        await supabase_service.update_contract_status(contract_id, "processing_ocr")
        text = await textract_service.extract_text(s3_key)

        if not text.strip():
            await supabase_service.update_contract_status(contract_id, "error")
            return

        # Step 2: Entity extraction
        await supabase_service.update_contract_status(contract_id, "processing_extraction")
        metadata = await extraction_service.extract_metadata(text)
        await supabase_service.save_metadata(contract_id, metadata)

        # Generate alerts
        await alert_service.generate_alerts(contract_id, metadata)

        # Step 3: Embeddings
        await supabase_service.update_contract_status(contract_id, "processing_embeddings")
        await EmbeddingService.index_contract(contract_id, file_name, text)

        # Done
        await supabase_service.update_contract_status(contract_id, "ready")
        logger.info(f"Contract {contract_id} processed successfully")

    except Exception as e:
        import traceback
        logger.error(f"Failed to process contract {contract_id}: {e}")
        logger.error(traceback.format_exc())
        await supabase_service.update_contract_status(contract_id, "error")


@router.post("/upload", response_model=UploadResponse)
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no debe exceder 50MB")

    s3_key = f"contracts/{user_id}/{uuid.uuid4()}/{file.filename}"

    # Upload to S3
    await s3_service.upload_file(content, s3_key)

    # Create DB record
    contract = await supabase_service.create_contract(user_id, file.filename, s3_key)

    # Start background processing
    background_tasks.add_task(
        process_contract, contract["id"], s3_key, file.filename
    )

    return UploadResponse(
        contract_id=contract["id"],
        file_name=file.filename,
        status="pending",
    )


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    user_id: str = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
):
    contracts, total = await supabase_service.list_contracts(
        user_id, page, page_size, search
    )
    return ContractListResponse(
        contracts=[ContractResponse(**c) for c in contracts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{contract_id}", response_model=ContractDetailResponse)
async def get_contract(
    contract_id: str,
    user_id: str = Depends(get_current_user),
):
    contract = await supabase_service.get_contract(contract_id, user_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    metadata = await supabase_service.get_metadata(contract_id)
    meta_response = ContractMetadataResponse(**metadata) if metadata else None

    return ContractDetailResponse(
        **contract,
        metadata=meta_response,
    )


@router.get("/{contract_id}/status", response_model=StatusResponse)
async def get_contract_status(
    contract_id: str,
    user_id: str = Depends(get_current_user),
):
    contract = await supabase_service.get_contract(contract_id, user_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return StatusResponse(status=contract["status"])


@router.get("/{contract_id}/download-url")
async def get_download_url(
    contract_id: str,
    user_id: str = Depends(get_current_user),
):
    contract = await supabase_service.get_contract(contract_id, user_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    url = await s3_service.get_download_url(contract["s3_key"])
    return {"url": url}


@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: str,
    user_id: str = Depends(get_current_user),
):
    contract = await supabase_service.get_contract(contract_id, user_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Delete from S3
    try:
        await s3_service.delete_file(contract["s3_key"])
    except Exception as e:
        logger.warning(f"Failed to delete S3 file: {e}")

    # Delete vectors
    try:
        await EmbeddingService.delete_contract(contract_id)
    except Exception as e:
        logger.warning(f"Failed to delete vectors: {e}")

    # Delete from DB
    await supabase_service.delete_contract(contract_id, user_id)

    return {"status": "deleted"}
