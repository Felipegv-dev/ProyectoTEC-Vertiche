import logging
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _model = None
    _chroma_client = None
    _collection = None

    @classmethod
    def initialize(cls):
        """Load the embedding model and initialize ChromaDB. Called at startup."""
        if cls._model is None:
            logger.info("Loading sentence-transformers model...")
            cls._model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("Model loaded successfully")

        if cls._chroma_client is None:
            cls._chroma_client = chromadb.PersistentClient(
                path=settings.chroma_persist_directory,
            )
            cls._collection = cls._chroma_client.get_or_create_collection(
                name="contracts",
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"ChromaDB initialized at {settings.chroma_persist_directory}")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            cls.initialize()
        return cls._model

    @classmethod
    def get_collection(cls):
        if cls._collection is None:
            cls.initialize()
        return cls._collection

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
        """Chunk text, generate embeddings, and store in ChromaDB."""
        chunks = cls.chunk_text(text)
        if not chunks:
            logger.warning(f"No chunks generated for contract {contract_id}")
            return 0

        model = cls.get_model()
        embeddings = model.encode(chunks).tolist()

        ids = [f"{contract_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"contract_id": contract_id, "contract_name": contract_name, "chunk_index": i}
            for i in range(len(chunks))
        ]

        collection = cls.get_collection()
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        logger.info(f"Indexed {len(chunks)} chunks for contract {contract_id}")
        return len(chunks)

    @classmethod
    async def query(cls, query_text: str, n_results: int = 8, contract_ids: list[str] | None = None) -> list[dict]:
        """Query ChromaDB for relevant chunks."""
        model = cls.get_model()
        query_embedding = model.encode([query_text]).tolist()

        collection = cls.get_collection()

        where_filter = None
        if contract_ids:
            where_filter = {"contract_id": {"$in": contract_ids}}

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        chunks = []
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 0
                chunks.append({
                    "text": doc,
                    "contract_id": meta.get("contract_id", ""),
                    "contract_name": meta.get("contract_name", ""),
                    "chunk_index": meta.get("chunk_index", 0),
                    "relevance_score": 1 - distance,  # cosine distance to similarity
                })

        return chunks

    @classmethod
    async def delete_contract(cls, contract_id: str) -> None:
        """Remove all vectors for a contract."""
        if cls._collection is None:
            # ChromaDB not initialized yet, nothing to delete
            return
        collection = cls._collection
        results = collection.get(
            where={"contract_id": contract_id},
            include=[],
        )
        if results and results['ids']:
            collection.delete(ids=results['ids'])
            logger.info(f"Deleted {len(results['ids'])} vectors for contract {contract_id}")

embedding_service = EmbeddingService()
