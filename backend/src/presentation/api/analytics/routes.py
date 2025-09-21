from __future__ import annotations

from fastapi import APIRouter, Query

router = APIRouter(tags=["analytics"])  # mounted under /api/v1


@router.get("/dashboard/stats", summary="Graph database stats (stub MVP)")
async def get_dashboard_stats():
    """Temporary stub returning graph-oriented metrics.

    This returns a stable schema for the dashboard:
    - node_count: total number of nodes
    - relationship_count: total number of relationships
    - community_count: detected communities (e.g., via community detection)
    - top_labels: list of { label, count }
    """
    return {
        "node_count": 50,
        "relationship_count": 100,
        "community_count": 10,
        "top_labels": [],
    }



