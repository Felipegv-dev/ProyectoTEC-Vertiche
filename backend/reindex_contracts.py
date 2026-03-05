"""
Re-index all existing contracts with the new embedding model (multilingual-e5-base, 768 dims).

Usage:
    cd backend
    python reindex_contracts.py

Prerequisites:
    1. Run database/migration_rag_v2.sql in Supabase SQL Editor first
    2. Ensure .env is configured with all required variables
"""
import asyncio
import logging
import sys
import os

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.services.embedding_service import EmbeddingService
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def reindex_all():
    """Fetch all contracts with stored text and re-index them."""
    logger.info("Initializing embedding model and reranker...")
    EmbeddingService.initialize()

    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # Get all contracts that are ready
    result = supabase.table("contracts").select("id, file_name").eq("status", "ready").execute()
    contracts = result.data or []

    if not contracts:
        logger.info("No contracts found to re-index.")
        return

    logger.info(f"Found {len(contracts)} contracts to re-index.")

    for i, contract in enumerate(contracts, 1):
        contract_id = contract["id"]
        file_name = contract["file_name"]
        logger.info(f"[{i}/{len(contracts)}] Re-indexing: {file_name} ({contract_id})")

        # Get existing chunks to reconstruct the original text
        chunks_result = (
            supabase.table("contract_embeddings")
            .select("content, chunk_index")
            .eq("contract_id", contract_id)
            .order("chunk_index")
            .execute()
        )

        if not chunks_result.data:
            logger.warning(f"  No existing chunks found for {contract_id}, skipping.")
            continue

        # Reconstruct approximate original text from chunks
        # (since we have overlap, just concatenate - the new chunker will re-split properly)
        full_text = " ".join(row["content"] for row in chunks_result.data)

        # Re-index with new model
        num_chunks = await EmbeddingService.index_contract(contract_id, file_name, full_text)
        logger.info(f"  Indexed {num_chunks} chunks.")

    logger.info("Re-indexing complete!")


if __name__ == "__main__":
    asyncio.run(reindex_all())
