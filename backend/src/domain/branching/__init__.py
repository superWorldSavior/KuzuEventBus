"""Branching domain - Git-like database versioning."""
from .branch import Branch
from .value_objects import BranchName

__all__ = ["Branch", "BranchName"]
