from __future__ import annotations
"""
Query builder for Casys ORM - LINQ-style fluent API with lambdas.
"""

from typing import Optional, List, Callable, Any, Type
from types import SimpleNamespace
from .orm import NodeEntity, PropertyRef, ComparisonExpr, LogicalExpr, OrderByExpr
import inspect
import warnings


class QueryBuilder:
    """
    Fluent query builder for entity queries.
    
    Usage:
        builder = QueryBuilder(Person, branch)
        results = (builder
            .where(lambda p: p.age > 20 and p.city.name == "Paris")
            .order_by_desc(lambda p: p.age)
            .take(5)
            .all())
    """
    
    def __init__(self, entity_class: Type[NodeEntity], branch):
        self.entity_class = entity_class
        self.branch = branch
        self._where_clause = None
        self._order_by_clauses = []
        self._limit_value = None
        self._depth_min = 1
        self._depth_max = 3
        self._include_relations = []
        self._params: dict[str, Any] = {}
        self._with_items: list[tuple[str, str]] = []  # (alias, expr_gql)
        self._return_fields: list[str] | None = None
        self._exists_clauses: list[str] = []         # EXISTS {...}
        self._where_post_with: Callable[[Any], bool] | None = None  # WHERE after WITH
        self._joins: list[dict] = []  # join patterns: {dir: 'out'|'in', via:str, target:str|None, alias:str, min:int|None, max:int|None}
    
    def where(self, predicate: Callable[[Any], bool]) -> 'QueryBuilder':
        """
        Add a WHERE filter using a lambda.
        
        Example:
            .where(lambda p: p.age > 20)
            .where(lambda p: p.age > 20 and p.city.name == "Paris")
        
        Note: If called after select(), the WHERE will be placed after WITH.
        """
        # If we have WITH items (select was called), this WHERE goes after WITH
        if self._with_items:
            self._where_post_with = predicate
        else:
            self._where_clause = predicate
        return self
    
    def order_by(self, key_selector: Callable[[Any], Any]) -> 'QueryBuilder':
        """
        Order results ascending.
        
        Example:
            .order_by(lambda p: p.age)
        """
        self._order_by_clauses.append((key_selector, False))
        return self
    
    def order_by_desc(self, key_selector: Callable[[Any], Any]) -> 'QueryBuilder':
        """
        Order results descending.
        
        Example:
            .order_by_desc(lambda p: p.age)
        """
        self._order_by_clauses.append((key_selector, True))
        return self
    
    def take(self, count: int) -> 'QueryBuilder':
        """
        Limit the number of results (alias for limit).
        
        Example:
            .take(10)
        """
        self._limit_value = count
        return self

    def params(self, values: dict[str, Any]) -> 'QueryBuilder':
        """
        Bind named parameters used in the query (e.g., $minAge). Existing keys are overwritten.
        """
        if values:
            self._params.update(values)
        return self

    def param(self, key: str, value: Any) -> 'QueryBuilder':
        """Bind a single named parameter."""
        self._params[key] = value
        return self
    
    def limit(self, count: int) -> 'QueryBuilder':
        """
        Limit the number of results.
        
        Example:
            .limit(10)
        """
        self._limit_value = count
        return self
    
    def depth(self, *args, min: int | None = None, max: int | None = None) -> 'QueryBuilder':
        """
        Set traversal depth for relationship navigation (variable-length paths).
        
        Semantics (aligned with ISO GQL):
        - depth(n)            → exactly n hops           (GQL: *n)
        - depth(n, m)         → between n and m hops     (GQL: *n..m)
        - depth(max=m)        → 1 to m hops              (GQL: *1..m)
        - depth(min=n)        → n to infinity            (GQL: *n..)
        - depth()             → 1 to infinity            (GQL: *)
        - depth(0, m)         → 0 to m hops (includes start) (GQL: *0..m)
        
        Notes:
        - Hops = number of edges traversed
        - min/max must be non-negative integers
        - When both positional args and kwargs provided, kwargs take precedence
        """
        # Determine min/max based on args/kwargs
        dmin: int | None = None
        dmax: int | None = None

        if min is not None or max is not None:
            dmin = 1 if min is None else min
            dmax = (2**31 - 1) if max is None else max
        else:
            if len(args) == 0:
                # depth() → 1..∞
                dmin, dmax = 1, (2**31 - 1)
            elif len(args) == 1:
                # depth(n) → exactly n
                dmin = int(args[0])
                dmax = int(args[0])
            elif len(args) == 2:
                dmin = int(args[0])
                dmax = int(args[1])
            else:
                raise ValueError("depth() takes 0, 1 or 2 positional arguments, optionally min= / max=")

        # Validation
        if dmin is None or dmax is None:
            raise ValueError("Invalid depth specification")
        if dmin < 0 or dmax < 0:
            raise ValueError("depth() min/max must be non-negative")
        if dmin > dmax:
            raise ValueError("depth() min must be <= max")

        self._depth_min = dmin
        self._depth_max = dmax
        return self
    
    def include(self, *relations: str) -> 'QueryBuilder':
        """
        Eagerly load relationships to avoid N+1 queries.
        
        Example:
            .include("friends", "city")
        """
        self._include_relations.extend(relations)
        return self
    
    def select(self, selector: Callable[[Any], Any] | None = None, **kwargs: Callable[[Any], Any]) -> 'QueryBuilder':
        """
        Project results (EF-like). 
        
        Supports two forms:
        1. Kwargs (simple, recommended): select(name=lambda p: p.name, age=lambda p: p.age)
        2. Lambda dict (complex calculations): select(lambda p: {"total": p.price + p.tax})
        
        Examples:
            # Simple kwargs
            .select(name=lambda p: p.name, age=lambda p: p.age)
            
            # With joins (using aliases)
            .join(lambda p: p.lives_in).select(person=lambda p: p.name, city=lambda c: c.name)
            
            # Complex calculations
            .select(lambda p: {"name": p.name, "total": p.price + p.tax})
        """
        self._with_items = []
        aliases = []
        
        if selector is not None:
            # Lambda dict form
            with_map = self._lambda_dict_mapping(selector)
            for alias, expr in with_map.items():
                self._with_items.append((alias, expr))
                aliases.append(alias)
        elif kwargs:
            # Kwargs form
            for alias, sel in kwargs.items():
                # Convert lambda to GQL expression
                expr_gql = self._lambda_to_expr_with_alias(sel, alias)
                self._with_items.append((alias, expr_gql))
                aliases.append(alias)
        else:
            raise ValueError("select() requires either a lambda dict or kwargs")
        
        self._return_fields = aliases
        return self

    def join(self, rel_selector: Callable[[Any], Any], alias: str | None = None, *depth: int, min: int | None = None, max: int | None = None, with_label: bool = False) -> 'QueryBuilder':
        """
        Join by navigating a relation declared on the entity (EF-like).
        Alias is automatically derived from target label (first letter) if not provided.
        
        Example:
            .join(lambda p: p.lives_in)  # alias auto: "c" from City
            .join(lambda p: p.friends, 1, 2)  # depth range 1..2
            .join(lambda p: p.lives_in, alias="home")  # override alias
        """
        warnings.warn(
            "QueryBuilder.join(...) est provisoirement obsolète: préférez with_relations(...) ou la navigation EF-like. Cette API sera revue.",
            DeprecationWarning,
            stacklevel=2,
        )
        # Extract relation name from lambda
        rel_name = self._extract_relation_name(rel_selector)
        rels = getattr(self.entity_class, '_relations', {}) or {}
        desc = rels.get(rel_name)
        if desc is None:
            raise ValueError(f"Relation '{rel_name}' not found on {self.entity_class.__name__}")
        
        # Get metadata
        via = getattr(desc, 'via', None)
        target = getattr(desc, 'target', None)
        inverse = getattr(desc, 'inverse', False)
        if not via:
            raise ValueError(f"Relation '{rel_name}' missing 'via' metadata")
        
        # Auto alias from target label (first letter)
        if alias is None:
            if target:
                alias = target[0].lower()
                # Handle collision with base var (will be managed in _build_gql)
            else:
                alias = 'n'  # fallback
        
        # Parse depth
        jmin = jmax = None
        if min is not None or max is not None:
            jmin = 1 if min is None else int(min)
            jmax = (2**31 - 1) if max is None else int(max)
        else:
            if len(depth) == 1:
                jmin = jmax = int(depth[0])
            elif len(depth) == 2:
                jmin, jmax = int(depth[0]), int(depth[1])
            elif len(depth) > 2:
                raise ValueError("join() depth takes 0, 1, or 2 positional integers")
        
        # Register join
        self._joins.append({
            'dir': 'in' if inverse else 'out',
            'via': via,
            'target': target,
            'alias': alias,
            'min': jmin,
            'max': jmax,
            'from': None,  # from base var
            'with_label': with_label
        })
        return self
    
    def join_from(self, from_alias: str, rel_selector: Callable[[Any], Any], alias: str | None = None, *depth: int, min: int | None = None, max: int | None = None, with_label: bool = False) -> 'QueryBuilder':
        """
        Chain join from an intermediate alias (for multi-hop joins).
        
        Example:
            .join(lambda p: p.friends, alias="f")
            .join_from("f", lambda f: f.lives_in, alias="c")
        """
        # Similar to join() but with from_alias
        # Note: we need to know the entity class for the from_alias to extract the relation
        # For now, we'll use a simplified approach: extract relation name and resolve via naming convention
        rel_name = self._extract_relation_name(rel_selector)
        # We assume the from_alias entity has been declared; for now we trust the user
        # In a full implementation, we'd track entity types per alias
        
        # For MVP: require explicit via/target or rely on global relation registry
        # Simplified: user can use join_out/join_in directly for chaining if needed
        raise NotImplementedError("join_from() requires entity type tracking; use join_out/join_in for now")

    def join_out(self, via: str, target: Any | None, alias: str, *depth: int, min: int | None = None, max: int | None = None) -> 'QueryBuilder':
        """
        Join 1-hop (or variable-length) from base var to an outgoing relation.
        Example: (p)-[:via*min..max]->(alias:target)
        """
        warnings.warn(
            "QueryBuilder.join_out(...) est provisoirement obsolète: préférez with_relations(...) ou la navigation EF-like. Cette API sera revue.",
            DeprecationWarning,
            stacklevel=2,
        )
        jmin = jmax = None
        if min is not None or max is not None:
            # Keyword-based depth
            jmin = 1 if min is None else int(min)
            jmax = (2**31 - 1) if max is None else int(max)
        else:
            # Positional-based depth
            if len(depth) == 1:
                jmin = jmax = int(depth[0])
            elif len(depth) == 2:
                jmin, jmax = int(depth[0]), int(depth[1])
            elif len(depth) > 2:
                raise ValueError("join_out depth takes 0, 1, or 2 positional integers")
        # Resolve target label if class provided
        target_label: str | None
        try:
            from .orm import NodeEntity as _NE  # local import to avoid cycle hints
            if isinstance(target, type) and issubclass(target, _NE):
                target_label = target._get_label()
            elif isinstance(target, str) or target is None:
                target_label = target
            else:
                target_label = None
        except Exception:
            target_label = target if isinstance(target, str) else None
        self._joins.append({'dir': 'out', 'via': via, 'target': target_label, 'alias': alias, 'min': jmin, 'max': jmax})
        return self

    def join_in(self, via: str, source: Any | None, alias: str, *depth: int, min: int | None = None, max: int | None = None) -> 'QueryBuilder':
        """
        Join 1-hop (or variable-length) incoming relation to base var.
        Example: (alias:source)-[:via*min..max]->(p)
        """
        warnings.warn(
            "QueryBuilder.join_in(...) est provisoirement obsolète: préférez with_relations(...) ou la navigation EF-like. Cette API sera revue.",
            DeprecationWarning,
            stacklevel=2,
        )
        jmin = jmax = None
        if min is not None or max is not None:
            jmin = 1 if min is None else int(min)
            jmax = (2**31 - 1) if max is None else int(max)
        else:
            if len(depth) == 1:
                jmin = jmax = int(depth[0])
            elif len(depth) == 2:
                jmin, jmax = int(depth[0]), int(depth[1])
            elif len(depth) > 2:
                raise ValueError("join_in depth takes 0, 1, or 2 positional integers")
        # Resolve source label if class provided; store as 'target' for symmetry
        source_label: str | None
        try:
            from .orm import NodeEntity as _NE
            if isinstance(source, type) and issubclass(source, _NE):
                source_label = source._get_label()
            elif isinstance(source, str) or source is None:
                source_label = source
            else:
                source_label = None
        except Exception:
            source_label = source if isinstance(source, str) else None
        self._joins.append({'dir': 'in', 'via': via, 'target': source_label, 'alias': alias, 'min': jmin, 'max': jmax})
        return self

    def join_rel(self, rel_name: str, alias: str, *depth: int, min: int | None = None, max: int | None = None) -> 'QueryBuilder':
        """
        Join en utilisant le nom de la relation déclarée dans l'entité (HasMany/HasOne),
        sans passer de strings pour via/label.
        Direction déterminée par 'inverse' du descriptor.
        """
        warnings.warn(
            "QueryBuilder.join_rel(...) est provisoirement obsolète: préférez with_relations(...) ou la navigation EF-like. Cette API sera revue.",
            DeprecationWarning,
            stacklevel=2,
        )
        rels = getattr(self.entity_class, '_relations', {}) or {}
        desc = rels.get(rel_name)
        if desc is None:
            raise ValueError(f"relation '{rel_name}' not found on {self.entity_class.__name__}")
        via = getattr(desc, 'via', None)
        target = getattr(desc, 'target', None)
        inverse = getattr(desc, 'inverse', False)
        if not via:
            raise ValueError(f"relation '{rel_name}' has no 'via' type")
        # depth: use kwargs if provided else positional
        jmin = jmax = None
        if min is not None or max is not None:
            jmin = 1 if min is None else int(min)
            jmax = (2**31 - 1) if max is None else int(max)
        else:
            if len(depth) == 1:
                jmin = jmax = int(depth[0])
            elif len(depth) == 2:
                jmin, jmax = int(depth[0]), int(depth[1])
            elif len(depth) > 2:
                raise ValueError("join_rel depth takes 0, 1, or 2 positional integers")
        self._joins.append({'dir': 'in' if inverse else 'out', 'via': via, 'target': target, 'alias': alias, 'min': jmin, 'max': jmax})
        return self

    def return_fields(self, *fields: str) -> 'QueryBuilder':
        """Set RETURN fields explicitly after select/with."""
        self._return_fields = list(fields)
        return self

    def where_exists_edge(self, rel: str, to: str | None = None,
                           min: int | None = None, max: int | None = None,
                           inverse: bool = False) -> 'QueryBuilder':
        """Add EXISTS clause for an outgoing/incoming edge with optional label and depth."""
        label = self.entity_class._get_label()
        var = label[0].lower()
        # Depth spec
        depth = ""
        if min is not None or max is not None:
            dmin = 1 if min is None else min
            dmax = 2**31 - 1 if max is None else max
            if dmin == dmax:
                depth = f"*{dmin}"
            else:
                depth = f"*{dmin}..{dmax}"
        # Target label
        target = f":{to}" if to else ""
        # Pattern (correlated): do NOT re-declare label on the outer var
        # Use (var) to bind to the outer MATCH variable
        if inverse:
            # (var)<-[:REL*..]-(t:Label)
            pattern = f"({var})<-[:{rel}{depth}]-(:{to})" if to else f"({var})<-[:{rel}{depth}]-()"
        else:
            pattern = f"({var})-[:{rel}{depth}]->(:{to})" if to else f"({var})-[:{rel}{depth}]->()"
        clause = f"EXISTS {{ MATCH {pattern} RETURN {var} }}"
        self._exists_clauses.append(clause)
        return self

    def where_not_exists_edge(self, rel: str, to: str | None = None,
                              min: int | None = None, max: int | None = None,
                              inverse: bool = False) -> 'QueryBuilder':
        """Add NOT EXISTS clause for an edge pattern."""
        # Build EXISTS then wrap with NOT
        tmp = QueryBuilder(self.entity_class, self.branch)
        tmp.where_exists_edge(rel, to, min, max, inverse)
        self._exists_clauses.append(f"NOT ({tmp._exists_clauses[-1]})")
        return self
    
    def all(self) -> List[NodeEntity]:
        """
        Execute the query and return all matching entities.
        """
        gql = self._build_gql()
        # Pass named parameters to the engine if provided
        result = self.branch.query(gql, self._params if self._params else None)
        
        # If projection (select/with) is used, return attribute-like rows
        if self._return_fields:
            rows_out: list[Any] = []
            rows = result.get('rows', []) if isinstance(result, dict) else []
            for row in rows:
                if isinstance(row, dict):
                    rows_out.append(SimpleNamespace(**row))
                elif isinstance(row, (list, tuple)):
                    data = {alias: row[i] if i < len(row) else None for i, alias in enumerate(self._return_fields)}
                    rows_out.append(SimpleNamespace(**data))
                else:
                    # Fallback: wrap as single value under first alias
                    data = {self._return_fields[0]: row}
                    rows_out.append(SimpleNamespace(**data))
            return rows_out

        # Else: convert rows to entity instances
        entities: list[NodeEntity] = []
        for row in result['rows']:
            entity = self._row_to_entity(row, result['columns'])
            entities.append(entity)
        return entities
    
    def first(self) -> Optional[NodeEntity]:
        """
        Execute the query and return the first result, or None.
        """
        results = self.take(1).all()
        return results[0] if results else None
    
    def count(self) -> int:
        """
        Return the count of matching entities.
        """
        gql = self._build_count_gql()
        result = self.branch.query(gql, self._params if self._params else None)
        return result['rows'][0][0] if result['rows'] else 0

    def update(self, **fields: Any) -> int:
        """Update properties on matched entities using the current where() filter.

        Example:
            session.Person.where(lambda p: p.name == "Alice").update(age=31)

        Returns:
            Number of nodes updated
        """
        label = self.entity_class._get_label()
        var = label[0].lower()

        # Base MATCH
        gql = f"MATCH ({var}:{label})"

        # WHERE
        if self._where_clause:
            where_str = self._lambda_to_gql(self._where_clause, var)
            if where_str:
                gql += f" WHERE {where_str}"

        # SET with parameter binding
        if not fields:
            raise ValueError("update() requires at least one field=value to set")

        params: dict[str, Any] = dict(self._params) if self._params else {}
        set_parts: list[str] = []
        for key, value in fields.items():
            param_key = f"u_{key}"
            set_parts.append(f"{var}.{key} = ${param_key}")
            params[param_key] = value

        gql += " SET " + ", ".join(set_parts)
        gql += f" RETURN COUNT({var})"

        result = self.branch.query(gql, params if params else None)
        return result['rows'][0][0] if result and result.get('rows') else 0
    
    def _build_gql(self) -> str:
        """Build the ISO GQL query string from the builder state."""
        label = self.entity_class._get_label()
        var = label[0].lower()
        
        # MATCH clause - build a single MATCH with chained patterns
        used_aliases = {var}
        
        if not self._joins:
            # No joins: simple node pattern
            gql = f"MATCH ({var}:{label})"
        else:
            # With joins: build chained pattern (a)-[:R]->(b)-[:S]->(c)
            # Start with base node
            pattern = f"({var}:{label})"
            
            for j in self._joins:
                depth = ""
                jmin, jmax = j.get('min'), j.get('max')
                if jmin is not None or jmax is not None:
                    dmin = 1 if jmin is None else jmin
                    dmax = (2**31 - 1) if jmax is None else jmax
                    depth = f"*{dmin}" if dmin == dmax else f"*{dmin}..{dmax}"
                
                # Handle alias collision
                alias = j['alias']
                if alias in used_aliases:
                    suffix = 2
                    while f"{alias}{suffix}" in used_aliases:
                        suffix += 1
                    alias = f"{alias}{suffix}"
                    j['alias'] = alias  # update for select() to reference
                used_aliases.add(alias)
                
                # Target label (optional, based on with_label flag)
                tgt = f":{j['target']}" if (j.get('with_label') and j.get('target')) else ""
                
                # Append edge and next node to pattern
                if j['dir'] == 'out':
                    pattern += f"-[:{j['via']}{depth}]->({alias}{tgt})"
                else:
                    # inverse: prepend instead
                    pattern = f"({alias}{tgt})-[:{j['via']}{depth}]->" + pattern
            
            gql = f"MATCH {pattern}"
        
        # If select()/WITH is used and a pre-WITH WHERE exists, move it to post-WITH
        if self._with_items and self._where_clause is not None:
            self._where_post_with = self._where_clause
            self._where_clause = None

        # WHERE clause (plain, before WITH)
        where_parts: list[str] = []
        if self._where_clause:
            where_str = self._lambda_to_gql(self._where_clause, var)
            if where_str:
                where_parts.append(where_str)
        # EXISTS / NOT EXISTS
        if self._exists_clauses:
            where_parts.extend(self._exists_clauses)
        if where_parts:
            gql += " WHERE " + " AND ".join(where_parts)

        # WITH clause (EF-like select)
        if self._with_items:
            # If a WHERE is applied after WITH, keep base var in scope for that filter
            with_items: list[str] = []
            if self._where_post_with:
                with_items.append(f"{var}")
            with_items.extend([f"{expr} AS {alias}" for (alias, expr) in self._with_items])
            gql += f" WITH {', '.join(with_items)}"
            
            # WHERE after WITH (filter on aliases)
            if self._where_post_with:
                where_str = self._lambda_to_gql(self._where_post_with, None)  # aliases, not var
                if where_str:
                    gql += f" WHERE {where_str}"
        
        # RETURN clause
        if self._return_fields:
            gql += f" RETURN {', '.join(self._return_fields)}"
        else:
            gql += f" RETURN {var}"
        
        # ORDER BY clause
        if self._order_by_clauses:
            order_parts = []
            for selector, desc in self._order_by_clauses:
                # If WITH exists, the selector might refer to alias (we won't rewrite var prefix)
                prop = self._extract_property_from_lambda(selector, None if self._with_items else var)
                direction = "DESC" if desc else "ASC"
                order_parts.append(f"{prop} {direction}")
            gql += f" ORDER BY {', '.join(order_parts)}"
        
        # LIMIT clause
        if self._limit_value:
            gql += f" LIMIT {self._limit_value}"
        
        return gql

    def _lambda_to_expr_with_alias(self, lambda_func: Callable, alias: str) -> str:
        """Convert a lambda into a GQL expression. Prefer DSL capture, fallback to parsing.
        Example: lambda c: c.name => 'c.name'
        """
        # 1) Try DSL capture
        try:
            code = lambda_func.__code__
            param_name = code.co_varnames[0] if code.co_argcount > 0 else 'x'
            expr = lambda_func(Var(param_name))
            if isinstance(expr, Expr):
                return expr.to_gql()
        except Exception:
            pass
        # 2) Try bytecode quick-path
        try:
            code = lambda_func.__code__
            param_name = code.co_varnames[0] if code.co_varnames else 'x'
            attr_names = code.co_names
            if len(attr_names) == 1:
                return f"{param_name}.{attr_names[0]}"
        except Exception:
            pass
        # 3) Fallback: source parsing
        try:
            source = inspect.getsource(lambda_func).strip()
            if "lambda" not in source:
                return alias
            body = source.split("lambda", 1)[1].split(":", 1)[1].strip()
            paren_count = 0
            end_idx = len(body)
            for i, c in enumerate(body):
                if c == '(':
                    paren_count += 1
                elif c == ')':
                    if paren_count == 0:
                        end_idx = i
                        break
                    paren_count -= 1
                elif c == ',' and paren_count == 0:
                    end_idx = i
                    break
            body = body[:end_idx].strip()
            body = body.replace('"', "'")
            body = body.replace(" and ", " AND ")
            body = body.replace(" or ", " OR ")
            body = body.replace(" not ", " NOT ")
            body = body.replace("==", "=")
            return body
        except Exception:
            return alias

    def _build_count_gql(self) -> str:
        """Build a COUNT query."""
        label = self.entity_class._get_label()
        var = label[0].lower()
        
        gql = f"MATCH ({var}:{label})"
        
        if self._where_clause:
            where_str = self._lambda_to_gql(self._where_clause, var)
            if where_str:
                gql += f" WHERE {where_str}"
        
        gql += f" RETURN COUNT({var})"
        return gql
    
    def _lambda_to_gql(self, lambda_func: Callable, var: str | None) -> str:
        """
        Convert a lambda function to a GQL WHERE clause.
        Tries DSL capture first, then falls back to source parsing.
        """
        # 1) Try DSL capture
        try:
            code = lambda_func.__code__
            param_name = code.co_varnames[0] if code.co_argcount > 0 else 'x'
            call_var = Var(var if var is not None else param_name)
            expr = lambda_func(call_var)
            if isinstance(expr, Expr):
                return expr.to_gql()
        except Exception:
            pass
        
        # 2) Fallback: source parsing
        try:
            source = inspect.getsource(lambda_func).strip()
            if "lambda" not in source:
                return ""
            # Extract lambda body after ':'
            body = source.split("lambda", 1)[1].split(":", 1)[1].strip()
            # Trim trailing call context by balancing parentheses
            paren_count = 0
            end_idx = 0
            for i, c in enumerate(body):
                if c == '(':
                    paren_count += 1
                elif c == ')':
                    if paren_count == 0:
                        end_idx = i
                        break
                    paren_count -= 1
            if end_idx > 0:
                body = body[:end_idx]
            
            # Replace parameter name with GQL var if provided
            param_name = source.split("lambda", 1)[1].split(":", 1)[0].strip()
            if var is not None:
                body = body.replace(f"{param_name}.", f"{var}.")
            
            # Basic Python → GQL operator normalization
            body = body.replace(" and ", " AND ")
            body = body.replace(" or ", " OR ")
            body = body.replace(" not ", " NOT ")
            body = body.replace("==", "=")
            body = body.replace('"', "'")  # normalize quotes
            
            # EF-like: relation.any() → EXISTS {...}
            try:
                rels = getattr(self.entity_class, '_relations', {}) or {}
                label = self.entity_class._get_label()
                base_var = label[0].lower()
                for rel_name, rel_desc in rels.items():
                    # 1) any() without predicate
                    tokens_no_pred = []
                    if var is not None:
                        tokens_no_pred.append(f"{var}.{rel_name}.any()")
                    tokens_no_pred.append(f"{base_var}.{rel_name}.any()")
                    for token in tokens_no_pred:
                        if token in body:
                            exists_gql = self._build_exists_for_relation(rel_name, rel_desc)
                            body = body.replace(token, f"({exists_gql})")

                    # 2) any(predicate): parse lambda inside parentheses
                    # search prefixes like "p.rel.any(" or "base.rel.any("
                    tokens_pred = []
                    if var is not None:
                        tokens_pred.append(f"{var}.{rel_name}.any(")
                    tokens_pred.append(f"{base_var}.{rel_name}.any(")
                    for prefix in tokens_pred:
                        start = body.find(prefix)
                        while start != -1:
                            # find matching closing parenthesis for any(...)
                            i = start + len(prefix)
                            depth_par = 1
                            j = i
                            while j < len(body):
                                ch = body[j]
                                if ch == '(':
                                    depth_par += 1
                                elif ch == ')':
                                    depth_par -= 1
                                    if depth_par == 0:
                                        break
                                j += 1
                            if depth_par != 0:
                                # unmatched, stop
                                break
                            arg = body[i:j].strip()
                            replaced = False
                            if arg.startswith("lambda") and ":" in arg:
                                # parse predicate
                                inner_param = arg.split("lambda", 1)[1].split(":", 1)[0].strip()
                                pred = arg.split(":", 1)[1].strip()
                                # choose inner alias from target label
                                tgt_label = getattr(rel_desc, 'target', None)
                                inner_alias = (tgt_label or 'n')[0].lower()
                                # normalize predicate to use inner_alias
                                pred_body = pred.replace(f"{inner_param}.", f"{inner_alias}.")
                                pred_body = pred_body.replace('"', "'")
                                pred_body = pred_body.replace(" and ", " AND ")
                                pred_body = pred_body.replace(" or ", " OR ")
                                pred_body = pred_body.replace(" not ", " NOT ")
                                pred_body = pred_body.replace("==", "=")
                                # build pattern
                                from_var = var or base_var
                                via = getattr(rel_desc, 'via', None)
                                inverse = getattr(rel_desc, 'inverse', False)
                                dmin = getattr(rel_desc, 'depth_min', 1)
                                dmax = getattr(rel_desc, 'depth_max', 1)
                                depth_spec = ""
                                if dmin is not None and dmax is not None and not (dmin == 1 and dmax == 1):
                                    depth_spec = f"*{dmin}" if dmin == dmax else f"*{dmin}..{dmax}"
                                tgt = f":{tgt_label}" if tgt_label else ""
                                if inverse:
                                    pattern = f"({inner_alias}{tgt})-[:{via}{depth_spec}]->({from_var})"
                                else:
                                    pattern = f"({from_var})-[:{via}{depth_spec}]->({inner_alias}{tgt})"
                                exists_pred = f"EXISTS {{ MATCH {pattern} WHERE {pred_body} RETURN {from_var} }}"
                                # replace any(lambda ...) with (EXISTS {...})
                                body = body[:start] + f"({exists_pred})" + body[j+1:]
                                replaced = True
                            if not replaced:
                                # move past this occurrence to search further
                                start = body.find(prefix, start + len(prefix))
                            else:
                                # continue to find next occurrence after replaced region
                                start = body.find(prefix, start + len(exists_pred) + 2)
            except Exception:
                pass
            return body
        except Exception:
            return ""
    
    def _extract_property_from_lambda(self, lambda_func: Callable, var: str | None) -> str:
        """Extract property name from order_by lambda."""
        try:
            source = inspect.getsource(lambda_func).strip()
            if "lambda" in source:
                body = source.split("lambda")[1].split(":")[1].strip()
                # Find the closing parenthesis
                paren_count = 0
                end_idx = 0
                for i, c in enumerate(body):
                    if c == '(':
                        paren_count += 1
                    elif c == ')':
                        if paren_count == 0:
                            end_idx = i
                            break
                        paren_count -= 1
                
                if end_idx > 0:
                    body = body[:end_idx]
                
                param_name = source.split("lambda")[1].split(":")[0].strip()
                # Replace p.age with n.age if var provided; otherwise keep alias form
                if var is not None:
                    body = body.replace(f"{param_name}.", f"{var}.")
                return body
        except:
            pass
        return f"{var}.id" if var else "id"

    def _lambda_dict_mapping(self, lambda_func: Callable) -> dict[str, str]:
        """Parse lambda returning a dict into alias -> expression GQL strings.
        Example: lambda p: {"doubled": p.price * 2, "name": p.name}
        """
        try:
            source = inspect.getsource(lambda_func).strip()
            if "lambda" in source:
                param_name = source.split("lambda")[1].split(":")[0].strip()
                body = source.split("lambda")[1].split(":")[1].strip()
                # Trim trailing call context
                # Find outermost dict braces { ... }
                start = body.find("{")
                end = body.rfind("}")
                if start == -1 or end == -1:
                    return {}
                inner = body[start+1:end].strip()
                # Split on commas at top level
                items = []
                buf = ''
                depth = 0
                for ch in inner:
                    if ch in '({[':
                        depth += 1
                    elif ch in ')}]':
                        depth -= 1
                    if ch == ',' and depth == 0:
                        items.append(buf.strip())
                        buf = ''
                    else:
                        buf += ch
                if buf.strip():
                    items.append(buf.strip())
                mapping: dict[str, str] = {}
                for item in items:
                    if ':' not in item:
                        continue
                    key, expr = item.split(':', 1)
                    alias = key.strip().strip('"\'')
                    expr_gql = expr.strip()
                    # Replace param prefix p. -> var.
                    label = self.entity_class._get_label()
                    var = label[0].lower()
                    expr_gql = expr_gql.replace(f"{param_name}.", f"{var}.")
                    # String quotes normalization
                    expr_gql = expr_gql.replace('"', "'")
                    mapping[alias] = expr_gql
                return mapping
        except:
            pass
        return {}
    
    def _build_exists_for_relation(self, rel_name: str, rel_desc: Any) -> str:
        """
        Build an EXISTS GQL subquery for a relation declared on the entity (EF-like Any()).
        Uses HasMany metadata: target (label), via (rel type), inverse (bool), depth_min/max.
        """
        label = self.entity_class._get_label()
        var = label[0].lower()
        via = getattr(rel_desc, 'via', None)
        target = getattr(rel_desc, 'target', None)
        inverse = getattr(rel_desc, 'inverse', False)
        dmin = getattr(rel_desc, 'depth_min', 1)
        dmax = getattr(rel_desc, 'depth_max', 1)
        # Depth spec
        depth = ""
        if dmin is not None and dmax is not None and not (dmin == 1 and dmax == 1):
            depth = f"*{dmin}" if dmin == dmax else f"*{dmin}..{dmax}"
        # Target label
        target_label = f":{target}" if target else ""
        # Pattern
        if inverse:
            pattern = f"({var}:{label})<-[:{via}{depth}]-({target_label})" if target else f"({var}:{label})<-[:{via}{depth}]-()"
        else:
            pattern = f"({var}:{label})-[:{via}{depth}]->({target_label})" if target else f"({var}:{label})-[:{via}{depth}]->()"
        return f"EXISTS {{ MATCH {pattern} RETURN {var} }}"
    
    def _extract_relation_name(self, lambda_func: Callable) -> str:
        """Extract relation name from lambda like: lambda p: p.lives_in → 'lives_in'"""
        try:
            source = inspect.getsource(lambda_func).strip()
            if "lambda" not in source:
                raise ValueError("Not a lambda expression")
            body = source.split("lambda", 1)[1].split(":", 1)[1].strip()
            # Trim trailing call context (parentheses)
            paren_count = 0
            end_idx = len(body)
            for i, c in enumerate(body):
                if c == '(':
                    paren_count += 1
                elif c == ')':
                    if paren_count == 0:
                        end_idx = i
                        break
                    paren_count -= 1
            body = body[:end_idx].strip()
            # Extract relation: p.lives_in → lives_in
            if '.' in body:
                parts = body.split('.')
                return parts[-1]  # last part after dot
            return body
        except Exception as e:
            raise ValueError(f"Failed to extract relation name from lambda: {e}")
    
    def _row_to_entity(self, row: List[Any], columns: List[str]) -> NodeEntity:
        """Convert a query result row to an entity instance."""
        # For now, create entity with properties from row
        # TODO: Properly map columns to entity properties
        entity = self.entity_class()
        return entity


# --- Minimal DSL for robust lambda capture ---

class Expr:
    """Expression DSL for capturing lambda operations without source parsing."""
    def __init__(self, kind: str, value: Any = None, left: 'Expr | None' = None, op: 'str | None' = None, right: 'Expr | None' = None):
        self.kind = kind
        self.value = value
        self.left = left
        self.op = op
        self.right = right

    def __getattr__(self, name: str) -> 'Expr':
        if self.kind in ("var", "attr"):
            return Expr("attr", (self, name))
        raise AttributeError(name)

    # arithmetic
    def __add__(self, other): return Expr("bin", None, self, "+", _wrap(other))
    def __sub__(self, other): return Expr("bin", None, self, "-", _wrap(other))
    def __mul__(self, other): return Expr("bin", None, self, "*", _wrap(other))
    def __truediv__(self, other): return Expr("bin", None, self, "/", _wrap(other))

    # comparisons
    def __eq__(self, other): return Expr("bin", None, self, "=", _wrap(other))
    def __ne__(self, other): return Expr("bin", None, self, "!=", _wrap(other))
    def __lt__(self, other): return Expr("bin", None, self, "<", _wrap(other))
    def __le__(self, other): return Expr("bin", None, self, "<=", _wrap(other))
    def __gt__(self, other): return Expr("bin", None, self, ">", _wrap(other))
    def __ge__(self, other): return Expr("bin", None, self, ">=", _wrap(other))
    
    # logical (AND/OR)
    def __and__(self, other): return Expr("bin", None, self, "AND", _wrap(other))
    def __or__(self, other): return Expr("bin", None, self, "OR", _wrap(other))

    def to_gql(self) -> str:
        if self.kind == "var":
            return str(self.value)
        if self.kind == "attr":
            # flatten chained attributes
            parts = []
            cur = self
            while cur.kind == "attr":
                base, name = cur.value
                parts.append(name)
                cur = base
            if cur.kind == "var":
                parts.append(str(cur.value))
            parts.reverse()
            return ".".join(parts)
        if self.kind == "lit":
            v = self.value
            if isinstance(v, str):
                return f"'{v}'"
            return str(v)
        if self.kind == "bin":
            left_gql = self.left.to_gql()
            right_gql = self.right.to_gql()
            # Wrap AND/OR operands in parentheses for correct precedence
            if self.op in ("AND", "OR"):
                return f"({left_gql} {self.op} {right_gql})"
            return f"{left_gql} {self.op} {right_gql}"
        return ""

def _wrap(v: Any) -> Expr:
    """Wrap a value in an Expr if it isn't already."""
    if isinstance(v, Expr):
        return v
    return Expr("lit", v)

class Var(Expr):
    """Variable expression."""
    def __init__(self, name: str):
        super().__init__("var", name)
