"""Branching DTOs for application layer."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


# ==================== Create Branch ====================

@dataclass(frozen=True)
class CreateBranchRequest:
    """Request to create a new branch from an existing database."""
    
    tenant_id: UUID
    source_database_id: UUID
    source_database_name: str
    branch_name: str
    from_snapshot: str | None = "latest"  # 'latest', timestamp, or snapshot ID
    description: str | None = None


@dataclass(frozen=True)
class CreateBranchResponse:
    """Response after creating a branch."""
    
    branch_name: str
    full_name: str  # With --branch-- prefix
    parent_database_name: str
    branch_database_id: UUID
    snapshot_id: UUID
    created_at: str
    description: str | None = None
    origin_snapshot_id: UUID | None = None


# ==================== Merge Branch ====================

@dataclass(frozen=True)
class MergeBranchRequest:
    """Request to merge a branch into a target database."""
    
    tenant_id: UUID
    branch_database_id: UUID
    branch_database_name: str
    target_database_id: UUID
    target_database_name: str


@dataclass(frozen=True)
class MergeBranchResponse:
    """Response after merging a branch."""
    
    merged: bool
    branch_name: str
    target_database_name: str
    snapshot_id: UUID
    merged_at: str


# ==================== Delete Branch ====================

@dataclass(frozen=True)
class DeleteBranchRequest:
    """Request to delete a branch database."""
    
    tenant_id: UUID
    branch_database_id: UUID
    branch_database_name: str


@dataclass(frozen=True)
class DeleteBranchResponse:
    """Response after deleting a branch."""
    
    deleted: bool
    branch_name: str


# ==================== List Branches ====================

@dataclass(frozen=True)
class ListBranchesRequest:
    """Request to list all branches for a database."""
    
    tenant_id: UUID
    parent_database_name: str


@dataclass(frozen=True)
class BranchInfo:
    """Branch information for listing."""
    
    name: str
    full_name: str
    parent: str
    branch_database_id: UUID
    created_at: str
    description: str | None = None


@dataclass(frozen=True)
class ListBranchesResponse:
    """Response containing list of branches."""
    
    parent_database: str
    branches: list[BranchInfo]
    count: int
