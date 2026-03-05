import json
import logging
from anthropic import Anthropic
from app.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente experto en contratos de arrendamiento comercial en Mexico para la empresa Vertiche.
Tu trabajo es responder preguntas sobre los contratos de arrendamiento usando SOLO la informacion proporcionada en el contexto.

Reglas:
- Responde en espanol
- Basa tus respuestas UNICAMENTE en el contexto proporcionado (tanto los datos estructurados como los fragmentos de texto)
- Los DATOS ESTRUCTURADOS contienen informacion precisa ya extraida de cada contrato (renta, fechas, partes, etc.). Usa estos datos como fuente principal para datos puntuales.
- Los FRAGMENTOS DE TEXTO contienen secciones relevantes del contrato original. Usalos para detalles, clausulas y contexto adicional.
- Si la informacion no esta en el contexto, indica claramente que no tienes esa informacion disponible
- Se conciso pero completo
- Usa formato markdown cuando sea apropiado (listas, negritas, tablas)
- Cita los contratos especificos y secciones cuando sea relevante
- Si hay montos, usa formato de moneda mexicana (MXN)
- Prioriza la informacion de los fragmentos con mayor relevancia"""

METADATA_LABELS = {
    "arrendador": "Arrendador",
    "arrendatario": "Arrendatario",
    "direccion": "Direccion",
    "ciudad": "Ciudad",
    "estado": "Estado",
    "codigo_postal": "Codigo Postal",
    "metros_cuadrados": "Metros Cuadrados",
    "fecha_inicio": "Fecha de Inicio",
    "fecha_vencimiento": "Fecha de Vencimiento",
    "duracion_meses": "Duracion (meses)",
    "renta_mensual": "Renta Mensual",
    "incremento_anual": "Incremento Anual (%)",
    "deposito_garantia": "Deposito de Garantia",
    "moneda": "Moneda",
    "uso_permitido": "Uso Permitido",
    "clausula_renovacion": "Clausula de Renovacion",
    "penalizacion_terminacion_anticipada": "Penalizacion por Terminacion Anticipada",
    "mantenimiento_responsable": "Responsable de Mantenimiento",
    "seguros_requeridos": "Seguros Requeridos",
    "fiador": "Fiador",
    "notas_adicionales": "Notas Adicionales",
}


def _format_metadata(contract_name: str, metadata: dict) -> str:
    """Format structured metadata into readable context."""
    lines = [f"[Datos Estructurados - {contract_name}]"]
    for key, label in METADATA_LABELS.items():
        value = metadata.get(key)
        if value is not None and value != "" and value != "N/A":
            if key == "renta_mensual" and isinstance(value, (int, float)):
                lines.append(f"- {label}: ${value:,.2f} MXN")
            elif key == "deposito_garantia" and isinstance(value, (int, float)):
                lines.append(f"- {label}: ${value:,.2f} MXN")
            elif key == "incremento_anual" and isinstance(value, (int, float)):
                lines.append(f"- {label}: {value}%")
            elif key == "metros_cuadrados" and isinstance(value, (int, float)):
                lines.append(f"- {label}: {value} m2")
            else:
                lines.append(f"- {label}: {value}")
    return "\n".join(lines)


class RAGService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)

    async def _get_contract_metadata(self, contract_ids: list[str]) -> dict[str, dict]:
        """Fetch structured metadata for the given contracts."""
        metadata_map = {}
        for cid in contract_ids:
            meta = await supabase_service.get_metadata(cid)
            if meta:
                metadata_map[cid] = meta
        return metadata_map

    async def _get_contract_names(self, contract_ids: list[str]) -> dict[str, str]:
        """Fetch contract file names by ID."""
        names = {}
        for cid in contract_ids:
            result = supabase_service.client.table("contracts").select("file_name").eq("id", cid).execute()
            if result.data:
                names[cid] = result.data[0]["file_name"]
        return names

    async def query(self, question: str, contract_ids: list[str] | None = None):
        """
        Perform RAG query: embed question -> search pgvector -> rerank -> build context -> stream Claude response.
        Yields SSE-formatted events.
        """
        # 1. Search for relevant chunks (with reranking and threshold filtering)
        chunks = await EmbeddingService.query(
            query_text=question,
            n_results=5,
            contract_ids=contract_ids if contract_ids else None,
            similarity_threshold=0.25,
        )

        # 2. Collect all involved contract IDs (from chunks + session filter)
        involved_ids = set()
        if contract_ids:
            involved_ids.update(contract_ids)
        for chunk in chunks:
            involved_ids.add(chunk["contract_id"])

        # 3. Fetch structured metadata for all involved contracts
        metadata_map = await self._get_contract_metadata(list(involved_ids))
        contract_names = await self._get_contract_names(list(involved_ids))

        # 4. Build context: structured metadata first, then text chunks
        context_parts = []

        # Add structured metadata for all contracts in the session
        for cid in involved_ids:
            meta = metadata_map.get(cid)
            name = contract_names.get(cid, cid)
            if meta:
                context_parts.append(_format_metadata(name, meta))

        # Add text chunks
        sources = []
        best_per_contract: dict[str, dict] = {}

        for chunk in chunks:
            section_label = chunk.get("section", "General")
            context_parts.append(
                f"[Fragmento - {chunk['contract_name']} | Seccion: {section_label}]\n{chunk['text']}"
            )

            cid = chunk['contract_id']
            if cid not in best_per_contract or chunk['relevance_score'] > best_per_contract[cid]['relevance_score']:
                best_per_contract[cid] = chunk

        # Build sources from best chunk per contract
        for chunk in best_per_contract.values():
            section_label = chunk.get("section", "General")
            sources.append({
                "contract_id": chunk["contract_id"],
                "contract_name": chunk["contract_name"],
                "section": section_label,
                "chunk_text": chunk["text"][:300],
                "relevance_score": chunk["relevance_score"],
            })

        sources.sort(key=lambda s: s["relevance_score"], reverse=True)

        context = "\n\n---\n\n".join(context_parts) if context_parts else "No se encontro informacion relevante en los contratos."

        user_message = f"""Contexto de los contratos:

{context}

---

Pregunta del usuario: {question}"""

        # 5. Yield sources
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        # 6. Stream Claude response
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
