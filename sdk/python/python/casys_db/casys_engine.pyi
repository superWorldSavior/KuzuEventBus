"""Type stubs for casys_engine native module (Rust/pyo3 bindings)."""

from typing import Any, Dict, List

class CasysEngine:
    """
    Main engine for managing Casys graph databases.
    
    This is the entry point for interacting with the embedded graph database.
    It manages database lifecycle, branches, and provides access to the storage layer.
    
    Example:
        >>> engine = CasysEngine("/path/to/data")
        >>> engine.open_database("my_db")
        >>> branch = engine.open_branch("my_db", "main")
    """
    
    def __init__(self, data_dir: str) -> None:
        """
        Initialize the Casys engine with a data directory.
        
        Args:
            data_dir: Path to the directory where database files will be stored.
                     The directory will be created if it doesn't exist.
        
        Raises:
            RuntimeError: If the engine cannot be initialized (e.g., permission issues).
        """
        ...
    
    def open_database(self, name: str) -> str:
        """
        Open or create a database.
        
        Args:
            name: Database name (alphanumeric, hyphens, underscores allowed).
        
        Returns:
            The database name.
        
        Raises:
            RuntimeError: If the database cannot be opened.
            ValueError: If the name is invalid.
        """
        ...
    
    def open_branch(self, db_name: str, branch_name: str) -> CasysBranch:
        """
        Open a branch within a database.
        
        Args:
            db_name: Name of the database.
            branch_name: Name of the branch (e.g., "main", "dev").
        
        Returns:
            A CasysBranch instance for executing queries and mutations.
        
        Raises:
            RuntimeError: If the branch cannot be opened.
            ValueError: If names are invalid.
        """
        ...
    
    def create_branch(self, db_name: str, branch_name: str) -> None:
        """
        Create a new branch in a database.
        
        The new branch is created from the "main" branch at the current point in time.
        
        Args:
            db_name: Name of the database.
            branch_name: Name of the new branch.
        
        Raises:
            RuntimeError: If the branch cannot be created (e.g., already exists).
            ValueError: If names are invalid.
        """
        ...


class CasysBranch:
    """
    A branch within a Casys database.
    
    Branches provide isolation for concurrent work and enable point-in-time recovery.
    All graph operations (queries, mutations, persistence) are performed through a branch.
    
    Example:
        >>> branch = engine.open_branch("my_db", "main")
        >>> result = branch.query("MATCH (p:Person) RETURN p.name")
        >>> node_id = branch.add_node(["Person"], {"name": "Alice", "age": 30})
    """
    
    def query(self, gql: str) -> Dict[str, Any]:
        """
        Execute an ISO GQL query on this branch.
        
        Supports: MATCH, WHERE, RETURN, ORDER BY, LIMIT, aggregates (COUNT, SUM, AVG, MIN, MAX).
        
        Args:
            gql: ISO GQL query string.
        
        Returns:
            Dictionary with keys:
                - 'columns': List[str] - Column names
                - 'rows': List[List[Any]] - Result rows
        
        Raises:
            ValueError: If the query has syntax errors.
            RuntimeError: If execution fails.
        
        Example:
            >>> result = branch.query('''
            ...     MATCH (p:Person)
            ...     WHERE p.age > 18
            ...     RETURN p.name, p.age
            ...     ORDER BY p.age DESC
            ...     LIMIT 10
            ... ''')
            >>> print(result['columns'])  # ['p.name', 'p.age']
            >>> print(result['rows'])     # [['Alice', 30], ['Bob', 25], ...]
        """
        ...
    
    def add_node(self, labels: List[str], properties: Dict[str, Any]) -> int:
        """
        Add a node to the graph (low-level API).
        
        Args:
            labels: List of labels for the node (e.g., ["Person", "Employee"]).
            properties: Node properties as key-value pairs.
                       Supported types: str, int, float, bool, None.
        
        Returns:
            The node ID (integer).
        
        Raises:
            RuntimeError: If the node cannot be created.
            ValueError: If property types are unsupported.
        
        Example:
            >>> node_id = branch.add_node(
            ...     ["Person"],
            ...     {"name": "Alice", "age": 30, "active": True}
            ... )
        """
        ...
    
    def add_edge(
        self,
        from_id: int,
        to_id: int,
        edge_type: str,
        properties: Dict[str, Any]
    ) -> int:
        """
        Add an edge between two nodes (low-level API).
        
        Args:
            from_id: Source node ID.
            to_id: Target node ID.
            edge_type: Type of the relationship (e.g., "KNOWS", "FRIEND_OF").
            properties: Edge properties as key-value pairs.
        
        Returns:
            The edge ID (integer).
        
        Raises:
            RuntimeError: If the edge cannot be created (e.g., nodes don't exist).
            ValueError: If property types are unsupported.
        
        Example:
            >>> edge_id = branch.add_edge(
            ...     from_id=1,
            ...     to_id=2,
            ...     edge_type="KNOWS",
            ...     properties={"since": 2020}
            ... )
        """
        ...
    
    def flush(self) -> None:
        """
        Flush the in-memory graph to disk (persistence).
        
        Writes nodes and edges to segment files in the branch directory.
        This operation is synchronous and ensures durability.
        
        Raises:
            RuntimeError: If the flush operation fails (e.g., I/O error).
        
        Example:
            >>> branch.add_node(["Person"], {"name": "Alice"})
            >>> branch.flush()  # Persist to disk
        """
        ...
    
    def load(self) -> None:
        """
        Load the graph from disk into memory.
        
        Reads segment files from the branch directory and reconstructs the in-memory graph.
        This replaces the current in-memory state.
        
        Raises:
            RuntimeError: If the load operation fails (e.g., corrupted files).
        
        Example:
            >>> branch.load()  # Load persisted data
            >>> result = branch.query("MATCH (n) RETURN count(n)")
        """
        ...
