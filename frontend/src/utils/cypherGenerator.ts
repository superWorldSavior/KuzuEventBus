import { QueryNode, QueryConnection, QueryPattern, QueryConstraint } from "@/store/queryBuilder";

/**
 * Enhanced Cypher query generation from visual graph patterns
 */
export class CypherQueryGenerator {
  
  /**
   * Generate a complete Cypher query from the current pattern
   */
  static generateQuery(pattern: QueryPattern): {
    query: string;
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    try {
      // Extract nodes and relationships
      const entities = pattern.nodes.filter(n => n.type === "entity");
      const returnNodes = pattern.nodes.filter(n => n.type === "return");
      const filterNodes = pattern.nodes.filter(n => n.type === "filter");
      
      // Validate basic requirements
      if (entities.length === 0) {
        errors.push("At least one entity node is required");
      }
      
      // Build MATCH clause
      const matchClause = this.buildMatchClause(entities, pattern.connections, errors);
      
      // Build WHERE clause from constraints and filters
      const whereClause = this.buildWhereClause(entities, filterNodes, errors);
      
      // Build RETURN clause
      const returnClause = this.buildReturnClause(entities, returnNodes, errors);
      
      // Combine clauses
      const clauses = [matchClause, whereClause, returnClause].filter(Boolean);
      const query = clauses.join("\n");
      
      return {
        query,
        isValid: errors.length === 0 && query.length > 0,
        errors,
      };
      
    } catch (error) {
      errors.push(`Query generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        query: "",
        isValid: false,
        errors,
      };
    }
  }
  
  /**
   * Build the MATCH clause from entities and connections
   */
  private static buildMatchClause(
    entities: QueryNode[],
    connections: QueryConnection[],
    errors: string[]
  ): string {
    if (entities.length === 0) return "";
    
    const patterns: string[] = [];
    const processedConnections = new Set<string>();
    
    // Handle single nodes first
    if (entities.length === 1 && connections.length === 0) {
      const entity = entities[0];
      return `MATCH ${this.formatNode(entity)}`;
    }
    
    // Build connected patterns
    for (const connection of connections) {
      if (processedConnections.has(connection.id)) continue;
      
      const sourceNode = entities.find(n => n.id === connection.sourceId);
      const targetNode = entities.find(n => n.id === connection.targetId);
      
      if (!sourceNode || !targetNode) {
        errors.push(`Invalid connection: ${connection.id}`);
        continue;
      }
      
      const pattern = this.buildConnectionPattern(sourceNode, targetNode, connection);
      if (pattern) {
        patterns.push(pattern);
        processedConnections.add(connection.id);
      }
    }
    
    // Handle isolated entities
    const connectedNodeIds = new Set<string>();
    connections.forEach(conn => {
      connectedNodeIds.add(conn.sourceId);
      connectedNodeIds.add(conn.targetId);
    });
    
    entities.forEach(entity => {
      if (!connectedNodeIds.has(entity.id)) {
        patterns.push(this.formatNode(entity));
      }
    });
    
    return patterns.length > 0 ? `MATCH ${patterns.join(", ")}` : "";
  }
  
  /**
   * Build a connection pattern between two nodes
   */
  private static buildConnectionPattern(
    sourceNode: QueryNode,
    targetNode: QueryNode,
    connection: QueryConnection
  ): string {
    const source = this.formatNode(sourceNode);
    const target = this.formatNode(targetNode);
    const relationship = this.formatRelationship(connection);
    
    return `${source}-${relationship}->${target}`;
  }
  
  /**
   * Format a single node for Cypher
   */
  private static formatNode(node: QueryNode): string {
    const variable = node.variable || this.generateVariable(node.label);
    const labels = this.extractLabels(node);
    const properties = this.formatProperties(node.properties);
    
    let nodeStr = `(${variable}`;
    
    if (labels.length > 0) {
      nodeStr += `:${labels.join(":")}`;
    }
    
    if (properties) {
      nodeStr += ` ${properties}`;
    }
    
    nodeStr += ")";
    return nodeStr;
  }
  
  /**
   * Format a relationship for Cypher
   */
  private static formatRelationship(connection: QueryConnection): string {
    const type = connection.label || connection.type || "RELATED_TO";
    const properties = this.formatProperties(connection.properties);
    
    let relStr = `[${type.toUpperCase()}`;
    
    if (properties) {
      relStr += ` ${properties}`;
    }
    
    relStr += "]";
    return relStr;
  }
  
  /**
   * Format properties object for Cypher
   */
  private static formatProperties(properties?: Record<string, any>): string {
    if (!properties || Object.keys(properties).length === 0) {
      return "";
    }
    
    const propPairs = Object.entries(properties)
      .filter(([_, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => {
        const formattedValue = typeof value === "string" 
          ? `"${value.replace(/"/g, '\\"')}"` 
          : value;
        return `${key}: ${formattedValue}`;
      });
    
    return propPairs.length > 0 ? `{${propPairs.join(", ")}}` : "";
  }
  
  /**
   * Build WHERE clause from constraints and filter nodes
   */
  private static buildWhereClause(
    entities: QueryNode[],
    filterNodes: QueryNode[],
    _errors: string[]
  ): string {
    const conditions: string[] = [];
    
    // Add constraints from entity nodes
    entities.forEach(entity => {
      if (entity.constraints && entity.constraints.length > 0) {
        const variable = entity.variable || this.generateVariable(entity.label);
        entity.constraints.forEach(constraint => {
          const condition = this.formatConstraint(variable, constraint);
          if (condition) {
            conditions.push(condition);
          }
        });
      }
    });
    
    // Add conditions from filter nodes
    filterNodes.forEach(filter => {
      const condition = this.formatFilterNode(filter, entities);
      if (condition) {
        conditions.push(condition);
      }
    });
    
    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  }
  
  /**
   * Format a single constraint
   */
  private static formatConstraint(variable: string, constraint: QueryConstraint): string {
    if (!constraint.property || constraint.value === null || constraint.value === undefined) {
      return "";
    }
    
    const property = `${variable}.${constraint.property}`;
    const value = this.formatConstraintValue(constraint.value, constraint.type);
    
    switch (constraint.operator) {
      case "=":
        return `${property} = ${value}`;
      case "!=":
        return `${property} <> ${value}`;
      case ">":
        return `${property} > ${value}`;
      case "<":
        return `${property} < ${value}`;
      case ">=":
        return `${property} >= ${value}`;
      case "<=":
        return `${property} <= ${value}`;
      case "CONTAINS":
        return `${property} CONTAINS ${value}`;
      case "STARTS_WITH":
        return `${property} STARTS WITH ${value}`;
      case "ENDS_WITH":
        return `${property} ENDS WITH ${value}`;
      default:
        return `${property} = ${value}`;
    }
  }
  
  /**
   * Format constraint value based on type
   */
  private static formatConstraintValue(value: any, type: string): string {
    switch (type) {
      case "string":
        return `"${String(value).replace(/"/g, '\\"')}"`;
      case "number":
        return String(Number(value) || 0);
      case "boolean":
        return String(Boolean(value)).toLowerCase();
      case "date":
        return `date("${value}")`;
      default:
        return `"${String(value).replace(/"/g, '\\"')}"`;
    }
  }
  
  /**
   * Format filter node as condition
   */
  private static formatFilterNode(_filter: QueryNode, _entities: QueryNode[]): string {
    // This could be enhanced to parse filter node properties
    // For now, return a basic condition
    return "";
  }
  
  /**
   * Build RETURN clause
   */
  private static buildReturnClause(
    entities: QueryNode[],
    returnNodes: QueryNode[],
    _errors: string[]
  ): string {
    const returnItems: string[] = [];
    
    if (returnNodes.length > 0) {
      // Use explicit return nodes
      returnNodes.forEach(returnNode => {
        if (returnNode.variable) {
          returnItems.push(returnNode.variable);
        } else if (returnNode.properties?.expression) {
          returnItems.push(returnNode.properties.expression);
        }
      });
    } else {
      // Default: return all entity variables
      entities.forEach(entity => {
        const variable = entity.variable || this.generateVariable(entity.label);
        returnItems.push(variable);
      });
    }
    
    return returnItems.length > 0 ? `RETURN ${returnItems.join(", ")}` : "RETURN *";
  }
  
  /**
   * Extract labels from node
   */
  private static extractLabels(node: QueryNode): string[] {
    const labels: string[] = [];
    
    // Use the node label as the primary label
    if (node.label && node.label !== "Entity" && node.label !== "Node") {
      labels.push(node.label.replace(/\s+/g, ""));
    }
    
    // Check if there are additional labels in properties
    if (node.properties?.labels) {
      if (Array.isArray(node.properties.labels)) {
        labels.push(...node.properties.labels);
      } else if (typeof node.properties.labels === "string") {
        labels.push(node.properties.labels);
      }
    }
    
    return labels;
  }
  
  /**
   * Generate a variable name from a label
   */
  private static generateVariable(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 10) || "n";
  }
  
  /**
   * Validate and suggest improvements for a pattern
   */
  static validatePattern(pattern: QueryPattern): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    const entities = pattern.nodes.filter(n => n.type === "entity");
    const connections = pattern.connections;
    
    // Basic validations
    if (entities.length === 0) {
      errors.push("Add at least one entity node to create a valid query");
    }
    
    if (entities.length > 1 && connections.length === 0) {
      suggestions.push("Consider adding relationships between your entities");
    }
    
    // Check for isolated nodes
    const connectedNodeIds = new Set<string>();
    connections.forEach(conn => {
      connectedNodeIds.add(conn.sourceId);
      connectedNodeIds.add(conn.targetId);
    });
    
    const isolatedNodes = entities.filter(e => !connectedNodeIds.has(e.id));
    if (isolatedNodes.length > 0 && entities.length > 1) {
      suggestions.push(`${isolatedNodes.length} node(s) are not connected to the graph`);
    }
    
    // Check for variables
    const noVariableNodes = entities.filter(e => !e.variable || e.variable.trim() === "");
    if (noVariableNodes.length > 0) {
      suggestions.push("Consider adding variable names to your nodes for better query readability");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
    };
  }
  
  /**
   * Generate example queries for learning
   */
  static generateExamples(): Array<{
    title: string;
    description: string;
    pattern: Partial<QueryPattern>;
    query: string;
  }> {
    return [
      {
        title: "Simple Node Query",
        description: "Find all Person nodes",
        pattern: {
          nodes: [
            {
              id: "1",
              type: "entity",
              label: "Person",
              x: 100,
              y: 100,
              variable: "p",
              properties: {},
            }
          ],
          connections: [],
        },
        query: "MATCH (p:Person)\nRETURN p"
      },
      {
        title: "Relationship Query",
        description: "Find people who know each other",
        pattern: {
          nodes: [
            {
              id: "1",
              type: "entity",
              label: "Person",
              x: 50,
              y: 100,
              variable: "p1",
              properties: {},
            },
            {
              id: "2",
              type: "entity",
              label: "Person",
              x: 150,
              y: 100,
              variable: "p2",
              properties: {},
            }
          ],
          connections: [
            {
              id: "1",
              sourceId: "1",
              targetId: "2",
              type: "path",
              label: "KNOWS",
              properties: {},
            }
          ],
        },
        query: "MATCH (p1:Person)-[KNOWS]->(p2:Person)\nRETURN p1, p2"
      }
    ];
  }
}