import logging
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _model = None
    _supabase = None

    @classmethod
    def initialize(cls):
        """Load the embedding model and initialize Supabase client. Called at startup."""
        if cls._model is None:
            logger.info("Loading sentence-transformers model...")
            cls._model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("Model loaded successfully")

        if cls._supabase is None:
            cls._supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
            logger.info("Supabase client initialized for pgvector")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            cls.initialize()
        return cls._model

    @classmethod
    def _get_supabase(cls):
        if cls._supabase is None:
            cls.initialize()
        return cls._supabase

    @staticmethod
    def chunk_text(text: str) -> list[str]:
        """Split text into chunks using RecursiveCharacterTextSplitter."""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        return splitter.split_text(text)

    @classmethod
    async def index_contract(cls, contract_id: str, contract_name: str, text: str) -> int:
        """Chunk text, generate embeddings, and store in Supabase pgvector."""
        chunks = cls.chunk_text(text)
        if not chunks:
            logger.warning(f"No chunks generated for contract {contract_id}")
            return 0

        model = cls.get_model()
        embeddings = model.encode(chunks).tolist()

        supabase = cls._get_supabase()

        # Delete existing embeddings for this contract (in case of re-processing)
        supabase.table("contract_embeddings").delete().eq("contract_id", contract_id).execute()

        # Insert in batches of 50 to avoid payload limits
        batch_size = 50
        rows = [
            {
                "contract_id": contract_id,
                "contract_name": contract_name,
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding,
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        for start in range(0, len(rows), batch_size):
            batch = rows[start:start + batch_size]
            supabase.table("contract_embeddings").insert(batch).execute()

        logger.info(f"Indexed {len(chunks)} chunks for contract {contract_id}")
        return len(chunks)

    @classmethod
    async def query(cls, query_text: str, n_results: int = 8, contract_ids: list[str] | None = None) -> list[dict]:
        """Query Supabase pgvector for relevant chunks using cosine similarity."""
        model = cls.get_model()
        query_embedding = model.encode([query_text]).tolist()[0]

        supabase = cls._get_supabase()

        params = {
            "query_embedding": query_embedding,
            "match_count": n_results,
        }
        if contract_ids:
            params["filter_contract_ids"] = contract_ids

        result = supabase.rpc("match_contract_chunks", params).execute()

        chunks = []
        for row in result.data or []:
            chunks.append({
                "text": row["content"],
                "contract_id": row["contract_id"],
                "contract_name": row["contract_name"],
                "chunk_index": row["chunk_index"],
                "relevance_score": row["similarity"],
            })

        return chunks

    @classmethod
    async def delete_contract(cls, contract_id: str) -> None:
        """Remove all embeddings for a contract from Supabase."""
        supabase = cls._get_supabase()
        supabase.table("contract_embeddings").delete().eq("contract_id", contract_id).execute()
        logger.info(f"Deleted embeddings for contract {contract_id}")


embedding_service = EmbeddingService()
