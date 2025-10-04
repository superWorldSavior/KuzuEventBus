"""Branch entity - represents an isolated database copy for testing/development."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .value_objects import BranchName


@dataclass
class Branch:
    """
    Branch entity - Git-like database versioning.
    
    A branch is an isolated copy of a database that can be modified
    without affecting the original. It can later be merged back or discarded.
    """
    
    name: BranchName
    parent_database_id: UUID
    parent_database_name: str
    branch_database_id: UUID
    snapshot_id: UUID | None
    tenant_id: UUID
    created_at: datetime
    description: str | None = None
    
    @property
    def full_name(self) -> str:
        """Get full database name with branch prefix."""
        return self.name.to_full_name(self.parent_database_name)
    
    def is_mergeable(self) -> bool:
        """Check if branch can be merged (basic validation)."""
        # For now, all branches are mergeable
        # Could add checks like: not already merged, parent still exists, etc.
        return True
    
    def __str__(self) -> str:
        return f"Branch({self.name.value}, parent={self.parent_database_name})"
