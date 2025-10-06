"""
Session for managing entity queries and transactions.
"""

from typing import Type
from .orm import NodeEntity, ENTITY_REGISTRY
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

    def __getattr__(self, name: str) -> QueryBuilder:
        """Sugar: session.Person → QueryBuilder(Person) if Person is a registered entity."""
        cls = ENTITY_REGISTRY.get(name)
        if cls is not None:
            return self.query(cls)
        raise AttributeError(name)
    
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
        # Attach session for lazy-loading relations
        setattr(entity, "_session", self)
        
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
    
    def execute_raw(self, gql: str, params: dict | None = None) -> dict:
        """
        Execute a raw ISO GQL query.
        
        Args:
            gql: The ISO GQL query string
        
        Returns:
            Query result as a dictionary with 'columns' and 'rows'
        """
        if params is None:
            return self.branch.query(gql)
        return self.branch.query(gql, params)

    def execute_scalar(self, gql: str, params: dict | None = None):
        """Execute a query and return the first scalar value (or None)."""
        res = self.execute_raw(gql, params)
        if not res or not res.get("rows"):
            return None
        first_row = res["rows"][0]
        return first_row[0] if first_row else None

    # --- Constraints & Validation ---
    def validate_has_one_constraints(self, enforce: bool = True) -> list[str]:
        """
        Validate HasOne cardinality: for each entity and each HasOne relation,
        check that there is at most one outgoing edge of the given type per node.

        Returns a list of violation messages. If enforce=True and violations exist, raises ValueError.
        """
        violations: list[str] = []
        for entity_name, entity_cls in ENTITY_REGISTRY.items():
            relations = getattr(entity_cls, "_relations", {}) or {}
            for rel_name, desc in relations.items():
                if desc.__class__.__name__ != 'HasOne':
                    continue
                via = getattr(desc, 'via', None)
                target = getattr(desc, 'target', None)
                if not via:
                    # Try derive via from attribute name
                    via = rel_name.upper()
                label = entity_cls._get_label()
                var = label[0].lower()
                # choose alias for target
                tgt_alias = (target or 'n')[:1].lower() if target else 'n'
                tgt_label = f":{target}" if target else ""
                # Build GQL to compute counts per node
                gql = (
                    f"MATCH ({var}:{label})-[:{via}]->({tgt_alias}{tgt_label}) "
                    f"RETURN {var}, COUNT({tgt_alias})"
                )
                res = self.execute_raw(gql)
                rows = res.get('rows', []) if isinstance(res, dict) else []
                # Expect columns: [var, count]
                for row in rows:
                    if len(row) >= 2 and isinstance(row[1], (int, float)) and row[1] > 1:
                        violations.append(
                            f"HasOne violation on {entity_name}.{rel_name}: node {row[0]} has {int(row[1])} '{via}' edges"
                        )
        if enforce and violations:
            raise ValueError("HasOne constraints violated:\n" + "\n".join(violations))
        return violations
