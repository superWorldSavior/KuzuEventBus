"""
Session for managing entity queries and transactions.
"""

from typing import Type, Optional
from .orm import NodeEntity
from .query import QueryBuilder


class Session:
    """
    Session for querying entities and managing transactions.
    
    Usage:
        session = Session(branch)
        people = session.query(Person).where(lambda p: p.age > 20).all()
    """
    
    def __init__(self, branch):
        """
        Initialize a session with a branch.
        
        Args:
            branch: CasysBranch instance from the low-level API
        """
        self.branch = branch
        self._entities_cache = {}  # Cache for loaded entities
    
    def query(self, entity_class: Type[NodeEntity]) -> QueryBuilder:
        """
        Start a query for the given entity class.
        
        Args:
            entity_class: The entity class to query (e.g., Person)
        
        Returns:
            QueryBuilder instance for fluent query building
        
        Example:
            people = session.query(Person).where(lambda p: p.age > 20).all()
        """
        return QueryBuilder(entity_class, self.branch)
    
    def save(self, entity: NodeEntity) -> int:
        """
        Save an entity to the database (create or update).
        
        Args:
            entity: The entity instance to save
        
        Returns:
            The node ID of the saved entity
        """
        if entity._id is not None:
            # Update existing entity (not yet implemented)
            raise NotImplementedError("Entity updates not yet supported")
        
        # Create new node
        labels = entity.labels
        properties = entity._properties or {}
        
        # Convert properties to dict for native call
        props_dict = {}
        for k, v in properties.items():
            props_dict[k] = v
        
        node_id = self.branch.add_node(labels, props_dict)
        entity._id = node_id
        
        # Cache the entity
        self._entities_cache[node_id] = entity
        
        return node_id
    
    def delete(self, entity: NodeEntity):
        """
        Delete an entity from the database.
        
        Args:
            entity: The entity instance to delete
        
        Note: Delete operations require DELETE support in the query engine (not yet implemented)
        """
        if entity._id is None:
            raise ValueError("Cannot delete entity without ID")
        
        # TODO: Implement DELETE query when engine supports it
        raise NotImplementedError("DELETE operations not yet supported by engine")
    
    def flush(self):
        """
        Flush all pending changes to disk.
        
        Delegates to the branch's flush() method.
        """
        self.branch.flush()
    
    def load(self):
        """
        Load data from disk into memory.
        
        Delegates to the branch's load() method.
        """
        self.branch.load()
    
    def execute_raw(self, gql: str) -> dict:
        """
        Execute a raw ISO GQL query.
        
        Args:
            gql: The ISO GQL query string
        
        Returns:
            Query result as a dictionary with 'columns' and 'rows'
        """
        return self.branch.query(gql)
