"""
ORM (nouvelle API) pour Casys - EF-like, zéro strings

Expose:
- NodeEntity (entités nœuds)
- Label (marqueur de label)
- Relation (marqueur de relation, avec props)
- Builders: to(), from_(), both(), AnyOf(...).to(...)

Les relations sont déclarées via des descriptors RelationDescriptor, collectés par la metaclass.
"""

from typing import Optional, List, Any, Dict, Sequence

# Global registry of entity classes by name (for Session.<EntityName> sugar)
ENTITY_REGISTRY: Dict[str, type] = {}


class RelationDescriptor:
    """Descriptor stockant la définition d'une relation sur une entité.

    - edge_types: liste de types de relation (strings) ou None (auto via nom d'attribut)
    - target: label cible (string) ou classe NodeEntity ou 'Self'
    - direction: 'to' | 'from' | 'both'
    - depth_min/max: bornes pour *min..max
    - props_schema: dict nom->type pour props de relation (inline)
    """

    def __init__(self,
                 edge_types: Optional[List[str]],
                 target: Any,
                 direction: str,
                 depth_min: int = 1,
                 depth_max: int = 1,
                 props_schema: Optional[Dict[str, Any]] = None,
                 relation_cls: Any = None):
        self.edge_types = edge_types
        self.target = target
        self.direction = direction
        self.depth_min = depth_min
        self.depth_max = depth_max
        self.props_schema = props_schema or {}
        self.name: Optional[str] = None  # défini par metaclass
        self._cache: Dict[int, Any] = {}
        self.relation_cls = relation_cls

    # Compat properties for existing QueryBuilder expectations
    @property
    def via(self) -> str:
        if self.edge_types:
            return "|".join(self.edge_types)
        return (self.name or "").upper()

    @property
    def inverse(self) -> bool:
        return self.direction == 'from'

    def depth(self, min_depth: int, max_depth: Optional[int] = None) -> 'RelationDescriptor':
        self.depth_min = min_depth
        self.depth_max = min_depth if max_depth is None else max_depth
        return self

    def with_props(self, **schema: Any) -> 'RelationDescriptor':
        self.props_schema.update(schema)
        return self

    def __get__(self, instance, owner):
        if instance is None:
            return self
        key = id(instance)
        if key in self._cache:
            return self._cache[key]
        result: list = []  # lazy-loading à implémenter ultérieurement
        self._cache[key] = result
        return result

    def __set__(self, instance, value):
        self._cache[id(instance)] = value


class EntityMeta(type):
    """Metaclass des entités: enregistre relations et gère labels."""

    def __new__(mcs, name, bases, attrs):
        relations: Dict[str, RelationDescriptor] = {}
        for key, value in list(attrs.items()):
            if isinstance(value, RelationDescriptor):
                relations[key] = value
                value.name = key
                if value.target in (None, 'Self'):
                    value.target = name
                # Normaliser target en string label si classe fournie
                if isinstance(value.target, type) and issubclass(value.target, NodeEntity):
                    value.target = value.target._get_label()
        attrs['_relations'] = relations

        # Support override de label via attributs dcls: __label__ ou labels
        if '__label__' in attrs and not attrs.get('labels'):
            lab = attrs['__label__']
            attrs['labels'] = [getattr(lab, '__name__', str(lab))]
        elif 'labels' in attrs:
            # Convertir markers en noms si fournis
            labs = attrs['labels']
            if isinstance(labs, (list, tuple)):
                attrs['labels'] = [getattr(l, '__name__', l) for l in labs]

        cls = super().__new__(mcs, name, bases, attrs)
        if name != "NodeEntity":
            ENTITY_REGISTRY[name] = cls
        return cls


class Label:
    """Marqueur de label GQL (zéro strings)."""
    pass


class Relation:
    """Marqueur de relation GQL typée.

    Fournit des constructeurs directionnels retournant des RelationDescriptor.
    """

    @classmethod
    def to(cls, target: Any) -> RelationDescriptor:
        return RelationDescriptor([cls.__name__], target, 'to', relation_cls=cls)

    @classmethod
    def from_(cls, target: Any) -> RelationDescriptor:
        return RelationDescriptor([cls.__name__], target, 'from', relation_cls=cls)

    @classmethod
    def both(cls, target: Any) -> RelationDescriptor:
        return RelationDescriptor([cls.__name__], target, 'both', relation_cls=cls)


def to(target: Any) -> RelationDescriptor:
    """Relation sortante avec type auto depuis le nom d'attribut."""
    return RelationDescriptor(None, target, 'to')


def from_(target: Any) -> RelationDescriptor:
    """Relation entrante avec type auto depuis le nom d'attribut."""
    return RelationDescriptor(None, target, 'from')


def both(target: Any) -> RelationDescriptor:
    """Relation bidirectionnelle avec type auto depuis le nom d'attribut."""
    return RelationDescriptor(None, target, 'both')


class _AnyOf:
    def __init__(self, rel_types: Sequence[type]):
        self.rel_types = [rt for rt in rel_types]

    def _edges(self) -> List[str]:
        names: List[str] = []
        for rt in self.rel_types:
            try:
                if isinstance(rt, type) and issubclass(rt, Relation):
                    names.append(rt.__name__)
            except Exception:
                continue
        return names

    def to(self, target: Any) -> RelationDescriptor:
        return RelationDescriptor(self._edges(), target, 'to')

    def from_(self, target: Any) -> RelationDescriptor:
        return RelationDescriptor(self._edges(), target, 'from')

    def both(self, target: Any) -> RelationDescriptor:
        return RelationDescriptor(self._edges(), target, 'both')


def AnyOf(*relation_types: type) -> _AnyOf:
    """Union de types de relation: AnyOf(RelA, RelB).to(Target)."""
    return _AnyOf(relation_types)


class NodeEntity(metaclass=EntityMeta):
    """
    Base class for node entities in the graph.
    
    Provides an Entity Framework-style ORM for working with graph nodes.
    Supports lazy loading, relationship navigation, and automatic query generation.
    
        labels: List of node labels (e.g., ["Person", "Employee"])
        _id: Internal node ID (set automatically after save)
        _properties: Dictionary of node properties
    
    Example:
        >>> class KnowsRel(Relation):
        ...     since: int
        ...
        >>> class Person(NodeEntity):
        ...     labels = ["Person"]
        ...     friends = KnowsRel.both("Person").depth(1, 3)
    
        >>> # Create and save
        >>> alice = Person(name="Alice", age=30)
        >>> session.save(alice)
        
        >>> # Navigate relations (lazy loaded)
        >>> for friend in alice.friends:
        ...     print(friend.name)
    """
    
    labels: List[str] = []
    _relations: Dict[str, Any] = {}
    _id: Optional[int] = None
    
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

    def __init_subclass__(cls, *, label: Any = None, labels: Any = None, **kwargs):
        """Allow syntax: class Person(NodeEntity, label=PersonLabel) or labels=[...]."""
        super().__init_subclass__(**kwargs)
        # If label provided, override labels to single marker name
        if label is not None:
            try:
                cls.labels = [getattr(label, "__name__", str(label))]
            except Exception:
                cls.labels = [str(label)]
        elif labels is not None:
            try:
                seq = labels if isinstance(labels, (list, tuple)) else [labels]
                cls.labels = [getattr(l, "__name__", l) for l in seq]
            except Exception:
                cls.labels = [str(labels)]

    # --- Relations execution ---
    def with_relations(self, *attrs: Any) -> list[tuple[Any, 'NodeEntity']]:
        """
        Charger et retourner les paires (rel, node) pour les relations sélectionnées.

        Usage:
            for rel, person in me.with_relations(Person.boss, Person.friends): ...

        Note: v1 hydrate les props de relation si le moteur retourne l'arête (r) avec un dict properties.
        """
        if getattr(self, '_id', None) is None or not hasattr(self, '_session'):
            return []

        # Collect descriptors à partir des attributs fournis
        rel_map: Dict[str, RelationDescriptor] = getattr(self.__class__, '_relations', {}) or {}
        descs: list[RelationDescriptor] = []
        for a in attrs:
            if isinstance(a, RelationDescriptor):
                descs.append(a)
                continue
            if isinstance(a, str) and a in rel_map:
                descs.append(rel_map[a])
                continue
            # Essayer de retrouver par identité si a est un objet descriptor depuis la classe
            for name, d in rel_map.items():
                if a is d:
                    descs.append(d)
                    break

        results: list[tuple[Any, NodeEntity]] = []
        base_label = self._get_label()
        var_base = 'p'
        var_edge = 'r'
        var_tgt = 't'

        # Use ID() for filtering base node (moteur supporte maintenant ID())
        if self._id is None:
            return []
        where_clause = f"ID({var_base}) = $base_id"
        base_params = {"base_id": self._id}

        for desc in descs:
            # Edge types list (AnyOf ou unique). Si via contient un '|', découper.
            if desc.edge_types:
                edge_types = list(desc.edge_types)
            else:
                via = desc.via
                edge_types = via.split('|') if '|' in via else [via]

            # Depth
            if desc.depth_min == 1 and desc.depth_max == 1:
                depth_spec = ""
            else:
                dmin = desc.depth_min if desc.depth_min is not None else 1
                dmax = desc.depth_max if desc.depth_max is not None else (2**31 - 1)
                depth_spec = f"*{dmin}" if dmin == dmax else f"*{dmin}..{dmax}"

            tgt_label = desc.target

            # Construire edge_type_spec (union support via | déjà dans moteur)
            if len(edge_types) > 1:
                et_spec = '|'.join(edge_types)
            elif edge_types:
                et_spec = edge_types[0]
            else:
                et_spec = ""
            
            # Pattern selon direction (moteur supporte maintenant tous les patterns)
            if desc.direction == 'to':
                pattern = f"({var_base}:{base_label})-[{var_edge}:{et_spec}{depth_spec}]->({var_tgt}:{tgt_label})"
            elif desc.direction == 'from':
                pattern = f"({var_base}:{base_label})<-[{var_edge}:{et_spec}{depth_spec}]-({var_tgt}:{tgt_label})"
            else:  # both
                pattern = f"({var_base}:{base_label})-[{var_edge}:{et_spec}{depth_spec}]-({var_tgt}:{tgt_label})"
            
            # Une seule requête pour tout (union, direction, depth)
            # Retourner aussi le type d'arête pour les unions
            gql = f"MATCH {pattern} WHERE {where_clause} RETURN {var_edge}, {var_edge}.edge_type, {var_tgt}"
            res = self._session.execute_raw(gql, base_params)
            rows = res.get('rows', []) if isinstance(res, dict) else []
            columns = res.get('columns', []) if isinstance(res, dict) else []

            # Indices des colonnes
            try:
                idx_r = columns.index(var_edge)
            except Exception:
                idx_r = 0
            try:
                idx_t = columns.index(var_tgt)
            except Exception:
                idx_t = 1 if len(columns) > 1 else 0

            for row in rows:
                # Extraire valeurs r, t
                if isinstance(row, (list, tuple)):
                    r_val = row[idx_r] if idx_r < len(row) else None
                    t_val = row[idx_t] if idx_t < len(row) else None
                elif isinstance(row, dict):
                    r_val = row.get(var_edge)
                    t_val = row.get(var_tgt)
                else:
                    continue

                # Extraire le type réel de l'arête (pour unions)
                # Le moteur retourne l'edge_type dans les colonnes comme r.edge_type
                actual_edge_type = et_spec
                edge_type_key = f"{var_edge}.edge_type"
                if isinstance(row, dict) and edge_type_key in row:
                    actual_edge_type = row[edge_type_key]
                elif isinstance(row, (list, tuple)):
                    # Chercher la colonne edge_type
                    try:
                        et_idx = columns.index(edge_type_key)
                        if et_idx < len(row):
                            actual_edge_type = row[et_idx]
                    except:
                        pass
                
                # Construire l'instance de relation
                rel_inst: Any
                if getattr(desc, 'relation_cls', None):
                    rel_inst = desc.relation_cls()
                else:
                    # Auto relation: utiliser le type réel de l'edge
                    rel_inst = type(actual_edge_type if actual_edge_type else "Rel", (), {})()

                # Hydrater props de relation si disponibles
                try:
                    props = None
                    if isinstance(r_val, dict):
                        props = r_val.get('properties') or r_val.get('props') or None
                    if isinstance(props, dict):
                        for k, v in props.items():
                            setattr(rel_inst, k, v)
                except Exception:
                    pass

                # Hydrater le nœud cible
                node_inst = self._hydrate_node(tgt_label, t_val)
                if node_inst is not None:
                    # Attacher la session au nœud pour navigation ultérieure
                    setattr(node_inst, '_session', getattr(self, '_session', None))
                    results.append((rel_inst, node_inst))

        return results

    def _hydrate_node(self, label: str, raw: Any) -> 'NodeEntity | None':
        """Construire une instance d'entité depuis une valeur brute retournée par le moteur.

        Attend typiquement un dict avec 'properties' et éventuellement 'id' ou équivalent.
        """
        try:
            from .orm import ENTITY_REGISTRY  # local to avoid cycles
        except Exception:
            # fallback local
            globals_ref = globals()
            ENTITY_REGISTRY = globals_ref.get('ENTITY_REGISTRY', {})

        cls = ENTITY_REGISTRY.get(label)
        if cls is None:
            return None

        props: Dict[str, Any] = {}
        node_id = None
        if isinstance(raw, dict):
            # Essayer de trouver un sous-objet properties
            if 'properties' in raw and isinstance(raw['properties'], dict):
                props = dict(raw['properties'])
            else:
                # prendre tel quel si dict de props
                props = {k: v for k, v in raw.items() if k != 'id'}
            node_id = raw.get('id') or raw.get('_id')

        inst = cls(**props)
        if node_id is not None:
            setattr(inst, '_id', node_id)
        return inst


    


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
