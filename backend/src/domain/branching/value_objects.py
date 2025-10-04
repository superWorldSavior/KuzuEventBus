"""Value objects for branching domain."""
from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class BranchName:
    """Branch name value object with validation."""
    
    value: str
    
    def __post_init__(self):
        if not self.value:
            raise ValueError("Branch name cannot be empty")
        
        if len(self.value) < 2:
            raise ValueError("Branch name must be at least 2 characters")
        
        if len(self.value) > 50:
            raise ValueError("Branch name cannot exceed 50 characters")
        
        # Alphanumeric, hyphens, underscores only
        if not re.match(r'^[a-zA-Z0-9_-]+$', self.value):
            raise ValueError("Branch name can only contain alphanumeric, hyphens, and underscores")
        
        # Cannot start with hyphen or underscore
        if self.value[0] in ('-', '_'):
            raise ValueError("Branch name cannot start with hyphen or underscore")
    
    def to_full_name(self, parent_database: str) -> str:
        """Generate full database name with branch prefix."""
        return f"{parent_database}--branch--{self.value}"
    
    @staticmethod
    def from_full_name(full_name: str) -> tuple[str, BranchName] | None:
        """Parse full branch name into (parent, BranchName). Returns None if not a branch."""
        if "--branch--" not in full_name:
            return None
        
        parts = full_name.split("--branch--", 1)
        if len(parts) != 2:
            return None
        
        parent, branch_name = parts
        return (parent, BranchName(branch_name))
