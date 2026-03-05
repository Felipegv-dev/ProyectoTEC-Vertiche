import logging
import math
import re
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client

from app.config import settings

logger = logging.getLogger(__name__)

# Section patterns common in Mexican commercial lease contracts
SECTION_PATTERNS = [
    r"(?i)(cl[aá]usula\s+\w+[\.\-:\s])",
    r"(?i)(cap[ií]tulo\s+\w+[\.\-:\s])",
    r"(?i)(art[ií]culo\s+\w+[\.\-:\s])",
    r"(?i)(secci[oó]n\s+\w+[\.\-:\s])",
    r"(?i)(anexo\s+\w+[\.\-:\s])",
    r"(?i)(\d+[\.\-]\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)",
]


class EmbeddingService:
    _model = None
    _reranker = None
    _supabase = None

    @classmethod
    def initialize(cls):
        """Load the embedding model, reranker, and initialize Supabase client. Called at startup."""
        if cls._model is None:
            logger.info("Loading embedding model (multilingual-e5-base)...")
            cls._model = SentenceTransformer('intfloat/multilingual-e5-base')
            logger.info("Embedding model loaded successfully (768 dims)")

        if cls._reranker is None:
            logger.info("Loading cross-encoder reranker...")
            cls._reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            logger.info("Reranker loaded successfully")

        if cls._supabase is None:
            cls._supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
            logger.info("Supabase client initialized for pgvector")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            cls.initialize()
        return cls._model

    @classmethod
    def get_reranker(cls) -> CrossEncoder:
        if cls._reranker is None:
            cls.initialize()
        return cls._reranker

    @classmethod
    def _get_supabase(cls):
        if cls._supabase is None:
            cls.initialize()
        return cls._supabase

    @staticmethod
    def _detect_section(text: str) -> str:
        """Try to detect which contract section/clause a chunk belongs to."""
        for pattern in SECTION_PATTERNS:
            match = re.search(pattern, text[:200])
            if match:
                return match.group(1).strip().rstrip(".-:")
        return "General"

    @staticmethod
    def chunk_text(text: str) -> list[dict]:
        """Split text into chunks with section metadata."""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        raw_chunks = splitter.split_text(text)

        enriched_chunks = []
        for i, chunk in enumerate(raw_chunks):
            section = EmbeddingService._detect_section(chunk)
            enriched_chunks.append({
                "content": chunk,
                "section": section,
                "chunk_index": i,
            })

        return enriched_chunks

    @classmethod
    async def index_contract(cls, contract_id: str, contract_name: str, text: str) -> int:
        """Chunk text, generate embeddings, and store in Supabase pgvector."""
        chunks = cls.chunk_text(text)
        if not chunks:
            logger.warning(f"No chunks generated for contract {contract_id}")
            return 0

        model = cls.get_model()
        # e5 models require "passage: " prefix for documents
        texts_to_embed = [f"passage: {c['content']}" for c in chunks]
        embeddings = model.encode(texts_to_embed, normalize_embeddings=True).tolist()

        supabase = cls._get_supabase()

        # Delete existing embeddings for this contract (in case of re-processing)
        supabase.table("contract_embeddings").delete().eq("contract_id", contract_id).execute()

        # Insert in batches of 50 to avoid payload limits
        batch_size = 50
        rows = [
            {
                "contract_id": contract_id,
                "contract_name": contract_name,
                "chunk_index": chunk["chunk_index"],
                "content": chunk["content"],
                "section": chunk["section"],
                "embedding": embedding,
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]

        for start in range(0, len(rows), batch_size):
            batch = rows[start:start + batch_size]
            supabase.table("contract_embeddings").insert(batch).execute()

        logger.info(f"Indexed {len(chunks)} chunks for contract {contract_id}")
        return len(chunks)

    @classmethod
    async def query(
        cls,
        query_text: str,
        n_results: int = 5,
        contract_ids: list[str] | None = None,
        similarity_threshold: float = 0.25,
    ) -> list[dict]:
        """
        Advanced RAG retrieval pipeline:
        1. Embed query with e5 model
        2. Retrieve top candidates via pgvector cosine similarity
        3. Hybrid boost with keyword matching
        4. Rerank with cross-encoder
        5. Filter by similarity threshold
        """
        model = cls.get_model()
        # e5 models require "query: " prefix for queries
        query_embedding = model.encode([f"query: {query_text}"], normalize_embeddings=True).tolist()[0]

        supabase = cls._get_supabase()

        # Step 1: Vector search - retrieve more candidates than needed for reranking
        candidate_count = max(n_results * 3, 15)
        params = {
            "query_embedding": query_embedding,
            "match_count": candidate_count,
        }
        if contract_ids:
            params["filter_contract_ids"] = contract_ids

        result = supabase.rpc("match_contract_chunks", params).execute()

        candidates = []
        for row in result.data or []:
            candidates.append({
                "text": row["content"],
                "contract_id": row["contract_id"],
                "contract_name": row["contract_name"],
                "chunk_index": row["chunk_index"],
                "section": row.get("section", "General"),
                "vector_score": row["similarity"],
            })

        if not candidates:
            return []

        # Step 2: Hybrid boost - add keyword relevance
        query_terms = set(query_text.lower().split())
        for candidate in candidates:
            text_lower = candidate["text"].lower()
            keyword_hits = sum(1 for term in query_terms if term in text_lower and len(term) > 3)
            keyword_boost = min(keyword_hits * 0.03, 0.15)
            candidate["hybrid_score"] = candidate["vector_score"] + keyword_boost

        # Sort by hybrid score to feed best candidates to reranker
        candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)
        candidates = candidates[:max(n_results * 2, 10)]

        # Step 3: Cross-encoder reranking
        reranker = cls.get_reranker()
        pairs = [(query_text, c["text"]) for c in candidates]
        rerank_scores = reranker.predict(pairs)

        for candidate, score in zip(candidates, rerank_scores):
            candidate["rerank_score"] = float(score)

        # Sort by rerank score (cross-encoder is most accurate)
        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

        # Step 4: Filter by threshold and take top N
        filtered = []
        for c in candidates[:n_results]:
            # Use a combined relevance score for the final output
            # Normalize rerank score to 0-1 range (sigmoid-like)
            normalized_rerank = 1 / (1 + math.exp(-c["rerank_score"]))
            combined_score = 0.6 * normalized_rerank + 0.4 * c["vector_score"]

            if combined_score >= similarity_threshold:
                filtered.append({
                    "text": c["text"],
                    "contract_id": c["contract_id"],
                    "contract_name": c["contract_name"],
                    "chunk_index": c["chunk_index"],
                    "section": c["section"],
                    "relevance_score": round(combined_score, 3),
                })

        return filtered

    @classmethod
    async def delete_contract(cls, contract_id: str) -> None:
        """Remove all embeddings for a contract from Supabase."""
        supabase = cls._get_supabase()
        supabase.table("contract_embeddings").delete().eq("contract_id", contract_id).execute()
        logger.info(f"Deleted embeddings for contract {contract_id}")


embedding_service = EmbeddingService()
