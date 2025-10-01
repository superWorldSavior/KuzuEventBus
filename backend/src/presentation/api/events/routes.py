from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator
import contextlib

from fastapi import APIRouter, Depends, Request
from starlette.responses import StreamingResponse

from src.presentation.api.context.request_context import (
    RequestContext,
    get_request_context,
)
from src.infrastructure.dependencies import redis_connection

router = APIRouter(prefix="/events", tags=["events"])  # mounted at /api/v1/events

async def _sse_stream(redis, stream_key: str, start_id: str) -> AsyncIterator[bytes]:
    from src.infrastructure.logging.config import infra_logger
    last_id = start_id
    # If start_id is empty, default to live-only ('$') to avoid replay duplicates on reconnect
    if not last_id:
        last_id = "$"
    infra_logger.info(f"SSE stream started for {stream_key}, starting from {last_id}")
    while True:
        try:
            # BLOCK for up to 5s waiting for new entries
            entries = await redis.xread({stream_key: last_id}, block=5000, count=10)
        except Exception:
            # brief backoff on connection hiccup
            await asyncio.sleep(0.5)
            continue

        if not entries:
            # keep-alive comment to prevent idle timeouts
            yield b":\n\n"
            continue

        for _, messages in entries:
            for entry_id, fields in messages:
                last_id = entry_id
                # fields are strings (decode_responses=True)
                event = fields.get("event_type", "notification")
                infra_logger.info(f"SSE sending event: {event}, tx_id={fields.get('transaction_id', 'N/A')}")
                payload = json.dumps(fields, ensure_ascii=False).encode("utf-8")
                yield b"id: " + entry_id.encode("utf-8") + b"\n"
                yield b"event: " + event.encode("utf-8") + b"\n"
                yield b"data: " + payload + b"\n\n"


@router.get(
    "/stream",
    response_class=StreamingResponse,
    summary="SSE: flux d'événements du tenant",
    description=(
        "Stream Server-Sent Events en temps réel depuis Redis Streams (events:{tenant_id}).\n"
        "Supporte le header Last-Event-ID pour reprise après reconnexion."
    ),
    responses={
        200: {"description": "Flux SSE"},
        401: {"description": "Non autorisé"},
    },
)
async def event_stream(request: Request, ctx: RequestContext = Depends(get_request_context)):
    """Server-Sent Events stream scoped to the tenant.

    Reads from Redis Stream events:{tenant_id}. Supports Last-Event-ID for catch-up.
    """
    redis = redis_connection()
    stream_key = f"events:{ctx.tenant_id}"
    # Last-Event-ID header is standard for SSE reconnection
    last_event_id = request.headers.get("last-event-id", request.query_params.get("last_id", ""))

    async def stream_generator():
        async for chunk in _sse_stream(redis, stream_key, last_event_id):
            yield chunk

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
