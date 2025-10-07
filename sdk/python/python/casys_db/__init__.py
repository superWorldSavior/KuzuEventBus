"""
casys - High-level Python API for the Casys embedded graph database

This package provides native bindings (casys_engine) and an Entity Framework-style ORM.
"""

# Native bindings (Rust via pyo3)
# In dev, linters may not resolve top-level 'casys_engine' (compiled ext). Fallback to relative stub.
try:  # runtime when installed via maturin
    from casys_engine import CasysEngine, CasysBranch  # type: ignore
except Exception:  # dev/type-checker path
    from .casys_engine import CasysEngine, CasysBranch  # type: ignore

# High-level API (simple wrapper over Rust bindings)
from .database import Database, Branch

# ORM (Entity Framework-style) - nouvelle API
from .orm import NodeEntity, Label, Relation, to, from_, both, AnyOf
from .session import Session
from .query import QueryBuilder

__version__ = "0.1.0"

__all__ = [
    # High-level API (recommended for most users)
    "Database",
    "Branch",
    
    # Low-level bindings (advanced usage)
    "CasysEngine",
    "CasysBranch",
    
    # ORM
    "NodeEntity",
    "Label",
    "Relation",
    "to",
    "from_",
    "both",
    "AnyOf",
    "Session",
    "QueryBuilder",
]
