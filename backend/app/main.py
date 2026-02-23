import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import contracts, chat, dashboard

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    logger.info("Starting Vertiche API...")
    # Pre-load embedding model + Supabase pgvector client so first query is fast
    from app.services.embedding_service import EmbeddingService
    EmbeddingService.initialize()
    logger.info("Embedding model and pgvector ready.")
    yield
    logger.info("Shutting down Vertiche API...")


app = FastAPI(
    title="Vertiche API",
    description="Contract Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
if settings.environment == "development":
    origins = ["*"]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(contracts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
    }
