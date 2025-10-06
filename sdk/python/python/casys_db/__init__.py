"""
casys - High-level Python API for the Casys embedded graph database

This package provides native bindings (casys_engine) and an Entity Framework-style ORM.
"""

# Native bindings (Rust via pyo3)
from casys_engine import CasysEngine, CasysBranch  # type: ignore

# ORM (Entity Framework-style)
from .orm import NodeEntity, RelEntity, HasMany, HasOne
from .session import Session
from .query import QueryBuilder

__version__ = "0.1.0"

__all__ = [
    "CasysEngine",
    "CasysBranch",
    "NodeEntity",
    "RelEntity",
    "HasMany",
    "HasOne",
    "Session",
    "QueryBuilder",
]
