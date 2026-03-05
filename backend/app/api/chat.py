import json
import logging
from anthropic import Anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.api.auth import get_current_user
from app.config import settings
from app.models.schemas import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
)
from app.services.supabase_service import supabase_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

_anthropic_client = Anthropic(api_key=settings.anthropic_api_key)


async def _generate_title(user_message: str) -> str:
    """Generate a short chat session title from the first user message."""
    try:
        response = _anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=30,
            messages=[{
                "role": "user",
                "content": f"Genera un titulo muy corto (maximo 6 palabras, sin comillas) para una conversacion que empieza con este mensaje: \"{user_message}\"",
            }],
        )
        title = response.content[0].text.strip().strip('"').strip("'")
        return title[:60]
    except Exception as e:
        logger.warning(f"Failed to generate title: {e}")
        return user_message[:50]


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(
    body: ChatSessionCreate,
    user_id: str = Depends(get_current_user),
):
    session = await supabase_service.create_chat_session(
        user_id, body.title, body.contract_ids
    )
    return ChatSessionResponse(**session)


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user_id: str = Depends(get_current_user),
):
    sessions = await supabase_service.list_chat_sessions(user_id)
    return [ChatSessionResponse(**s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=list[ChatMessageResponse])
async def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    session = await supabase_service.get_chat_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    messages = await supabase_service.get_messages(session_id)
    return [ChatMessageResponse(**m) for m in messages]


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    body: ChatMessageCreate,
    user_id: str = Depends(get_current_user),
):
    session = await supabase_service.get_chat_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Save user message
    await supabase_service.save_message(session_id, "user", body.content)

    # Auto-generate title on first message if session has default title
    is_first_message = session.get("title", "").strip() in ("Nueva conversación", "Nueva conversacion", "")
    generated_title = None
    if is_first_message:
        generated_title = await _generate_title(body.content)
        await supabase_service.update_session_title(session_id, generated_title)

    # Get contract IDs for filtering
    contract_ids = session.get("contract_ids", [])

    session_id_for_save = session_id

    async def event_generator():
        # Send title update event if generated
        if generated_title:
            yield f"data: {json.dumps({'type': 'title', 'title': generated_title})}\n\n"

        full_response = ""
        sources_data = None

        async for event in rag_service.query(body.content, contract_ids or None):
            yield event

            # Parse to capture content for saving
            if event.startswith("data: "):
                data_str = event[6:].strip()
                if data_str and data_str != "[DONE]":
                    try:
                        parsed = json.loads(data_str)
                        if parsed.get("type") == "token":
                            full_response += parsed.get("content", "")
                        elif parsed.get("type") == "sources":
                            sources_data = parsed.get("sources")
                    except (json.JSONDecodeError, ValueError):
                        pass

        # Save assistant message after streaming completes
        if full_response:
            await supabase_service.save_message(
                session_id_for_save, "assistant", full_response, sources_data
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
):
    session = await supabase_service.get_chat_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    await supabase_service.delete_chat_session(session_id, user_id)
    return {"status": "deleted"}
