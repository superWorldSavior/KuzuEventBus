"""
Query builder for Casys ORM - LINQ-style fluent API with lambdas.
"""

from typing import Optional, List, Callable, Any, Type
from .orm import NodeEntity, PropertyRef, ComparisonExpr, LogicalExpr, OrderByExpr
import inspect


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
    
    def where(self, predicate: Callable[[Any], bool]) -> 'QueryBuilder':
        """
        Add a WHERE filter using a lambda.
        
        Example:
            .where(lambda p: p.age > 20)
            .where(lambda p: p.age > 20 and p.city.name == "Paris")
        """
        # Parse the lambda to extract the condition
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
    
    def limit(self, count: int) -> 'QueryBuilder':
        """
        Limit the number of results.
        
        Example:
            .limit(10)
        """
        self._limit_value = count
        return self
    
    def depth(self, *args) -> 'QueryBuilder':
        """
        Set traversal depth for relationship navigation.
        
        Examples:
            .depth(3)        # 1 to 3 hops (min=1, max=3)
            .depth(2, 5)     # 2 to 5 hops (min=2, max=5)
            .depth(0, 2)     # 0 to 2 hops (includes starting node)
        """
        if len(args) == 1:
            # Single arg: max depth, min defaults to 1
            self._depth_min = 1
            self._depth_max = args[0]
        elif len(args) == 2:
            # Two args: min and max
            self._depth_min = args[0]
            self._depth_max = args[1]
        else:
            raise ValueError("depth() takes 1 or 2 arguments")
        
        return self
    
    def include(self, *relations: str) -> 'QueryBuilder':
        """
        Eagerly load relationships to avoid N+1 queries.
        
        Example:
            .include("friends", "city")
        """
        self._include_relations.extend(relations)
        return self
    
    def select(self, selector: Callable[[Any], Any]) -> 'QueryBuilder':
        """
        Project results (return specific fields).
        
        Example:
            .select(lambda p: {"name": p.name, "age": p.age})
        """
        # TODO: Implement projection
        return self
    
    def all(self) -> List[NodeEntity]:
        """
        Execute the query and return all matching entities.
        """
        gql = self._build_gql()
        result = self.branch.query(gql)
        
        # Convert result rows to entity instances
        entities = []
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
        result = self.branch.query(gql)
        return result['rows'][0][0] if result['rows'] else 0
    
    def _build_gql(self) -> str:
        """Build the ISO GQL query string from the builder state."""
        label = self.entity_class._get_label()
        var = label[0].lower()
        
        # MATCH clause
        gql = f"MATCH ({var}:{label})"
        
        # WHERE clause
        if self._where_clause:
            where_str = self._lambda_to_gql(self._where_clause, var)
            if where_str:
                gql += f" WHERE {where_str}"
        
        # RETURN clause
        gql += f" RETURN {var}"
        
        # ORDER BY clause
        if self._order_by_clauses:
            order_parts = []
            for selector, desc in self._order_by_clauses:
                prop = self._extract_property_from_lambda(selector, var)
                direction = "DESC" if desc else "ASC"
                order_parts.append(f"{prop} {direction}")
            gql += f" ORDER BY {', '.join(order_parts)}"
        
        # LIMIT clause
        if self._limit_value:
            gql += f" LIMIT {self._limit_value}"
        
        return gql
    
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
    
    def _lambda_to_gql(self, lambda_func: Callable, var: str) -> str:
        """
        Convert a lambda function to a GQL WHERE clause.
        
        This is a simplified version - a real implementation would need
        to parse the lambda's AST properly.
        """
        # Get the source code of the lambda
        try:
            source = inspect.getsource(lambda_func).strip()
            # Extract the lambda body (after "lambda p:")
            if "lambda" in source:
                body = source.split("lambda")[1].split(":")[1].strip()
                # Find the closing parenthesis of the lambda call
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
                
                # Replace variable name with GQL variable
                param_name = source.split("lambda")[1].split(":")[0].strip()
                body = body.replace(f"{param_name}.", f"{var}.")
                # Convert Python operators to GQL
                body = body.replace(" and ", " AND ")
                body = body.replace(" or ", " OR ")
                body = body.replace("==", "=")
                # Convert double quotes to single quotes for GQL strings
                body = body.replace('"', "'")
                return body
        except:
            pass
        
        return ""
    
    def _extract_property_from_lambda(self, lambda_func: Callable, var: str) -> str:
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
                # Replace p.age with n.age
                body = body.replace(f"{param_name}.", f"{var}.")
                return body
        except:
            pass
        return f"{var}.id"
    
    def _row_to_entity(self, row: List[Any], columns: List[str]) -> NodeEntity:
        """Convert a query result row to an entity instance."""
        # For now, create entity with properties from row
        # TODO: Properly map columns to entity properties
        entity = self.entity_class()
        return entity
