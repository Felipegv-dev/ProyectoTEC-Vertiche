import json
import logging
from anthropic import Anthropic
from app.config import settings
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente experto en contratos de arrendamiento comercial en México para la empresa Vertiche.
Tu trabajo es responder preguntas sobre los contratos de arrendamiento usando SOLO la información proporcionada en el contexto.

Reglas:
- Responde en español
- Basa tus respuestas ÚNICAMENTE en el contexto proporcionado
- Si la información no está en el contexto, indica que no tienes esa información
- Sé conciso pero completo
- Usa formato markdown cuando sea apropiado (listas, negritas, tablas)
- Cita los contratos específicos cuando sea relevante
- Si hay montos, usa formato de moneda mexicana"""


class RAGService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    async def query(self, question: str, contract_ids: list[str] | None = None):
        """
        Perform RAG query: embed question -> search ChromaDB -> build context -> stream Claude response.
        Yields SSE-formatted events.
        """
        # 1. Search for relevant chunks
        chunks = await EmbeddingService.query(
            query_text=question,
            n_results=8,
            contract_ids=contract_ids if contract_ids else None,
        )

        # 2. Build context from chunks
        context_parts = []
        sources = []
        seen_contracts = set()

        for chunk in chunks:
            context_parts.append(
                f"[Contrato: {chunk['contract_name']}]\n{chunk['text']}"
            )
            if chunk['contract_id'] not in seen_contracts:
                sources.append({
                    "contract_id": chunk["contract_id"],
                    "contract_name": chunk["contract_name"],
                    "chunk_text": chunk["text"][:200],
                    "relevance_score": round(chunk["relevance_score"], 3),
                })
                seen_contracts.add(chunk['contract_id'])

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No se encontró información relevante en los contratos."

        user_message = f"""Contexto de los contratos:

{context}

---

Pregunta del usuario: {question}"""

        # 3. Yield sources
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # 4. Stream Claude response
        with self.client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        yield "data: [DONE]\n\n"

rag_service = RAGService()
