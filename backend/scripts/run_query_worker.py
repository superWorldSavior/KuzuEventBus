from __future__ import annotations

import asyncio
import os

from src.infrastructure.dependencies import (
    message_queue_service,
    transaction_repository,
    cache_service,
)
from src.infrastructure.kuzu.kuzu_query_execution_adapter import (
    KuzuQueryExecutionAdapter,
)
from src.infrastructure.workers.query_worker import QueryWorker


async def main() -> None:
    # Ensure env defaults
    os.environ.setdefault("ENVIRONMENT", "development")

    queue = message_queue_service()
    repo = transaction_repository()
    executor = KuzuQueryExecutionAdapter()
    cache = cache_service()

    worker = QueryWorker(queue=queue, transactions=repo, executor=executor, cache=cache)
    print("[worker] QueryWorker started. Press Ctrl+C to stop.")
    try:
        await worker.run_forever()
    except asyncio.CancelledError:
        pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[worker] Stopped by user")
