"""
High-level Database API - Inspired by TypeScript SDK
Simple, ergonomic interface over the Rust bindings.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
try:
    from casys_engine import CasysEngine, CasysBranch
except ImportError:
    from .casys_engine import CasysEngine, CasysBranch


class Database:
    """
    High-level database interface.
    
    Example:
        >>> db = Database("social.db")
        >>> db.query("CREATE (p:Person {name: 'Alice'})")
        >>> db.commit()
    """
    
    def __init__(self, path: str, *, data_dir: Optional[str] = None):
        """
        Open or create a database.
        
        Args:
            path: Database name or path (e.g., "social.db")
            data_dir: Optional data directory (default: ~/.casys_db)
        """
        self._data_dir = data_dir or "~/.casys_db"
        self._engine = CasysEngine(data_dir=self._data_dir)
        
        # Extract database name from path
        self._db_name = path.replace(".db", "").replace("/", "_")
        
        # Open database
        self._engine.open_database(self._db_name)
        
        # Open or create default branch
        try:
            self._engine.create_branch(self._db_name, "main")
        except:
            pass  # Branch already exists
        
        self._current_branch = self._engine.open_branch(self._db_name, "main")
        self._branch_name = "main"
    
    def query(self, gql: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a GQL query on the current branch.
        
        Args:
            gql: ISO GQL query string
            params: Optional named parameters ($variable)
            
        Returns:
            Dict with 'columns' and 'rows'
        """
        return self._current_branch.query(gql, params)
    
    def commit(self) -> None:
        """Persist changes to disk (flush)."""
        self._current_branch.flush()
    
    def create_branch(self, name: str) -> 'Branch':
        """
        Create a new branch from current state.
        
        Args:
            name: Branch name
            
        Returns:
            Branch instance
        """
        self._engine.create_branch(self._db_name, name)
        return Branch(self._engine, self._db_name, name)
    
    def branch(self, name: str) -> 'Branch':
        """
        Switch to an existing branch.
        
        Args:
            name: Branch name
            
        Returns:
            Branch instance
        """
        return Branch(self._engine, self._db_name, name)
    
    def branch_at(self, name: str, timestamp: str) -> 'Branch':
        """
        Create a branch from a point in time (PITR).
        
        Args:
            name: New branch name
            timestamp: Time point ('2 hours ago', '2024-01-15T10:00:00Z', etc.)
            
        Returns:
            Branch instance at that point in time
        """
        # TODO: Implement PITR timestamp parsing
        # For now, create regular branch
        return self.create_branch(name)
    
    def history(self, from_time: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        View database history (all snapshots = historical events).
        
        Args:
            from_time: Optional start time (TODO: filter by time)
            
        Returns:
            List of historical snapshots
        """
        # For now, return all snapshots (each snapshot = a point in history)
        # TODO: Parse from_time and filter
        return self.snapshots()
    
    def snapshots(self) -> List[Dict[str, Any]]:
        """
        List all snapshots.
        
        Returns:
            List of snapshot metadata (timestamp, segments_count, branch)
        """
        return self._engine.list_snapshots(self._db_name, self._branch_name)


class Branch:
    """
    Represents a database branch (Git-like).
    """
    
    def __init__(self, engine: CasysEngine, db_name: str, branch_name: str):
        self._engine = engine
        self._db_name = db_name
        self._branch_name = branch_name
        self._branch = engine.open_branch(db_name, branch_name)
    
    def query(self, gql: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a query on this branch."""
        return self._branch.query(gql, params)
    
    def commit(self) -> None:
        """Persist changes to disk."""
        self._branch.flush()
    
    def load(self) -> None:
        """Load data from disk."""
        self._branch.load()
    
    @property
    def name(self) -> str:
        """Branch name."""
        return self._branch_name
