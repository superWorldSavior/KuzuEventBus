"""
ORM classes for Casys - Entity Framework-style

Defines NodeEntity, RelEntity, and relation descriptors (HasMany, HasOne).
"""

from typing import Optional, List, Any, Dict


class EntityMeta(type):
    """Metaclass for entities to register relations and properties."""
    
    def __new__(mcs, name, bases, attrs):
        # Collect relations
        relations = {}
        for key, value in list(attrs.items()):
            # Check if it's a relation descriptor by class name to avoid forward reference issues
            if value.__class__.__name__ in ('HasMany', 'HasOne'):
                relations[key] = value
                value.name = key
        
        attrs['_relations'] = relations
        return super().__new__(mcs, name, bases, attrs)


class NodeEntity(metaclass=EntityMeta):
    """
    Base class for node entities in the graph.
    
    Provides an Entity Framework-style ORM for working with graph nodes.
    Supports lazy loading, relationship navigation, and automatic query generation.
    
    Attributes:
        labels: List of node labels (e.g., ["Person", "Employee"])
        _id: Internal node ID (set automatically after save)
        _properties: Dictionary of node properties
    
    Example:
        >>> class Person(NodeEntity):
        ...     labels = ["Person"]
        ...     
        ...     # Relations with lazy loading
        ...     friends = HasMany("Person", via="KNOWS")
        ...     city = HasOne("City", via="LIVES_IN")
        ...     
        ...     # Traversals with depth control
        ...     network = HasMany("Person", via="KNOWS").depth(1, 3)
        
        >>> # Create and save
        >>> alice = Person(name="Alice", age=30)
        >>> session.save(alice)
        
        >>> # Navigate relations (lazy loaded)
        >>> for friend in alice.friends:
        ...     print(friend.name)
        
        >>> # Access city (lazy loaded)
        >>> print(alice.city.name)
    """
    
    labels: List[str] = []
    _relations: Dict[str, Any] = {}
    _id: Optional[int] = None
    _properties: Dict[str, Any] = None
    
    def __init__(self, **kwargs):
        self._properties = {}
        self._id = kwargs.pop('_id', None)
        
        # Set properties from kwargs
        for key, value in kwargs.items():
            if key not in self._relations:
                self._properties[key] = value
            else:
                # Relations are set via descriptors
                setattr(self, key, value)
    
    def __getattribute__(self, name):
        # Intercept property access for non-relation attributes
        if name.startswith('_') or name in ('labels', '_relations', '_properties', '_id'):
            return object.__getattribute__(self, name)
        
        relations = object.__getattribute__(self, '_relations')
        if name in relations:
            # Delegate to relation descriptor
            return relations[name].__get__(self, type(self))
        
        # Access from _properties
        props = object.__getattribute__(self, '_properties')
        if name in props:
            return props[name]
        
        # Fallback to normal attribute
        return object.__getattribute__(self, name)
    
    def __setattr__(self, name, value):
        if name.startswith('_') or name in ('labels',):
            object.__setattr__(self, name, value)
        elif hasattr(self.__class__, '_relations') and name in self.__class__._relations:
            # Delegate to relation descriptor
            self.__class__._relations[name].__set__(self, value)
        else:
            # Store in _properties
            if not hasattr(self, '_properties'):
                object.__setattr__(self, '_properties', {})
            self._properties[name] = value
    
    @classmethod
    def _get_label(cls) -> str:
        """Get the primary label for this entity."""
        return cls.labels[0] if cls.labels else cls.__name__


class RelEntity:
    """
    Base class for relationship entities.
    
    Usage:
        class Knows(RelEntity):
            type = "KNOWS"
            since: int
            source_id: int
            target_id: int
    """
    
    type: str = ""
    _id: Optional[int] = None
    _properties: Dict[str, Any] = None
    
    def __init__(self, **kwargs):
        self._properties = {}
        self._id = kwargs.pop('_id', None)
        for key, value in kwargs.items():
            self._properties[key] = value


class HasMany:
    """
    Descriptor for one-to-many or many-to-many relationships.
    
    Provides lazy loading of related entities with automatic query generation.
    Supports depth control for graph traversals (ISO GQL *min..max syntax).
    
    Args:
        target: Target entity class name (e.g., "Person", "City")
        via: Relationship type (e.g., "KNOWS", "FRIEND_OF")
        inverse: If True, traverse edges in reverse direction (default: False)
        depth_min: Minimum traversal depth (default: 1)
        depth_max: Maximum traversal depth (default: 1)
    
    Example:
        >>> class Person(NodeEntity):
        ...     labels = ["Person"]
        ...     
        ...     # Direct friends (1 hop)
        ...     friends = HasMany("Person", via="KNOWS")
        ...     
        ...     # Friends of friends (1-3 hops)
        ...     network = HasMany("Person", via="KNOWS").depth(1, 3)
        ...     
        ...     # Followers (inverse direction)
        ...     followers = HasMany("Person", via="FOLLOWS", inverse=True)
        
        >>> alice = session.query(Person).where(lambda p: p.name == "Alice").first()
        >>> # Lazy load friends
        >>> for friend in alice.friends:
        ...     print(friend.name)
    """
    
    def __init__(self, target: str, via: str, inverse: bool = False, depth_min: int = 1, depth_max: int = 1):
        self.target = target
        self.via = via
        self.inverse = inverse
        self.depth_min = depth_min
        self.depth_max = depth_max
        self.name = None  # Set by metaclass
        self._cache = {}  # Cache loaded entities per instance
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        
        # Check cache
        instance_id = id(instance)
        if instance_id in self._cache:
            return self._cache[instance_id]
        
        # Lazy load from database
        if instance._id is None or not hasattr(instance, '_session'):
            # No ID or session, return empty
            result = []
            self._cache[instance_id] = result
            return result
        
        # Build query to load related entities
        session = instance._session
        label = instance._get_label()
        var_from = label[0].lower()
        target_label = self.target
        var_to = target_label[0].lower()
        
        # Build GQL with depth
        if self.depth_min == 1 and self.depth_max == 1:
            depth_spec = ""
        else:
            depth_spec = f"*{self.depth_min}..{self.depth_max}"
        
        if self.inverse:
            gql = f"MATCH ({var_from}:{label})<-[:{self.via}{depth_spec}]-({var_to}:{target_label}) WHERE ID({var_from}) = {instance._id} RETURN {var_to}"
        else:
            gql = f"MATCH ({var_from}:{label})-[:{self.via}{depth_spec}]->({var_to}:{target_label}) WHERE ID({var_from}) = {instance._id} RETURN {var_to}"
        
        result_data = session.execute_raw(gql)
        # TODO: Convert rows to entity instances
        result = []
        self._cache[instance_id] = result
        return result
    
    def __set__(self, instance, value):
        instance_id = id(instance)
        self._cache[instance_id] = value


class HasOne:
    """
    Descriptor for 1:1 or N:1 relationships.
    
    Usage:
        city = HasOne("City", via="LIVES_IN")
    """
    
    def __init__(self, target: str, via: str, inverse: bool = False):
        self.target = target
        self.via = via
        self.inverse = inverse
        self.name = None  # Set by metaclass
        self._cache = {}  # Cache loaded entity per instance
    
    def __get__(self, instance, owner):
        if instance is None:
            return self
        
        # Check cache
        instance_id = id(instance)
        if instance_id in self._cache:
            return self._cache[instance_id]
        
        # Lazy load from database
        if instance._id is None or not hasattr(instance, '_session'):
            return None
        
        # Build query to load related entity
        session = instance._session
        label = instance._get_label()
        var_from = label[0].lower()
        target_label = self.target
        var_to = target_label[0].lower()
        
        if self.inverse:
            gql = f"MATCH ({var_from}:{label})<-[:{self.via}]-({var_to}:{target_label}) WHERE ID({var_from}) = {instance._id} RETURN {var_to} LIMIT 1"
        else:
            gql = f"MATCH ({var_from}:{label})-[:{self.via}]->({var_to}:{target_label}) WHERE ID({var_from}) = {instance._id} RETURN {var_to} LIMIT 1"
        
        result_data = session.execute_raw(gql)
        # TODO: Convert first row to entity instance
        result = None
        self._cache[instance_id] = result
        return result
    
    def __set__(self, instance, value):
        instance_id = id(instance)
        self._cache[instance_id] = value


# Helper for property access in queries
class PropertyRef:
    """Reference to an entity property for query building."""
    
    def __init__(self, entity_class, property_name):
        self.entity_class = entity_class
        self.property_name = property_name
    
    def __gt__(self, other):
        return ComparisonExpr(self, '>', other)
    
    def __lt__(self, other):
        return ComparisonExpr(self, '<', other)
    
    def __ge__(self, other):
        return ComparisonExpr(self, '>=', other)
    
    def __le__(self, other):
        return ComparisonExpr(self, '<=', other)
    
    def __eq__(self, other):
        return ComparisonExpr(self, '==', other)
    
    def __ne__(self, other):
        return ComparisonExpr(self, '!=', other)
    
    def desc(self):
        """Mark for descending order."""
        return OrderByExpr(self, descending=True)
    
    def asc(self):
        """Mark for ascending order."""
        return OrderByExpr(self, descending=False)


class ComparisonExpr:
    """Comparison expression for WHERE clauses."""
    
    def __init__(self, left, op, right):
        self.left = left
        self.op = op
        self.right = right
    
    def __and__(self, other):
        return LogicalExpr(self, 'AND', other)
    
    def __or__(self, other):
        return LogicalExpr(self, 'OR', other)


class LogicalExpr:
    """Logical expression (AND/OR) for WHERE clauses."""
    
    def __init__(self, left, op, right):
        self.left = left
        self.op = op
        self.right = right


class OrderByExpr:
    """Order by expression."""
    
    def __init__(self, property_ref, descending=False):
        self.property_ref = property_ref
        self.descending = descending
