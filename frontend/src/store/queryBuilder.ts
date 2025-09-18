import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QueryNode {
  id: string;
  type: "entity" | "relationship" | "property" | "filter" | "return";
  label: string;
  x: number;
  y: number;
  properties?: {
    [key: string]: any;
  };
  constraints?: QueryConstraint[];
  variable?: string;
  selected?: boolean;
}

export interface QueryConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: "path" | "property" | "filter";
  label?: string;
  properties?: {
    [key: string]: any;
  };
}

export interface QueryConstraint {
  id: string;
  property: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH";
  value: any;
  type: "string" | "number" | "boolean" | "date";
}

export interface QueryPattern {
  nodes: QueryNode[];
  connections: QueryConnection[];
  name?: string;
  description?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  pattern: QueryPattern;
  cypherQuery: string;
  createdAt: string;
  lastModified: string;
  tags?: string[];
}

interface QueryBuilderState {
  // Current query being built
  currentPattern: QueryPattern;
  selectedNodeIds: string[];
  selectedConnectionIds: string[];
  
  // UI state
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  
  // Node palette
  showNodePalette: boolean;
  showPropertyPanel: boolean;
  
  // Query execution
  generatedCypher: string;
  isValidQuery: boolean;
  queryErrors: string[];
  
  // Saved queries
  savedQueries: SavedQuery[];
  
  // Schema information for auto-completion
  availableNodeTypes: string[];
  availableRelationshipTypes: string[];
  availableProperties: {
    [nodeType: string]: string[];
  };
}

interface QueryBuilderActions {
  // Pattern manipulation
  addNode: (node: Omit<QueryNode, "id">) => string;
  updateNode: (id: string, updates: Partial<QueryNode>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => string;
  
  addConnection: (connection: Omit<QueryConnection, "id">) => string;
  updateConnection: (id: string, updates: Partial<QueryConnection>) => void;
  removeConnection: (id: string) => void;
  
  // Selection
  selectNode: (id: string, multi?: boolean) => void;
  selectConnection: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Canvas operations
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  
  // UI state
  toggleNodePalette: () => void;
  togglePropertyPanel: () => void;
  
  // Query generation
  generateCypher: () => string;
  validateQuery: () => boolean;
  
  // Persistence
  saveQuery: (name: string, description?: string) => string;
  loadQuery: (id: string) => void;
  deleteQuery: (id: string) => void;
  duplicateQuery: (id: string) => string;
  
  // Import/Export
  exportPattern: () => string;
  importPattern: (data: string) => boolean;
  
  // Reset
  clearPattern: () => void;
  reset: () => void;
}

type QueryBuilderStore = QueryBuilderState & QueryBuilderActions;

const initialPattern: QueryPattern = {
  nodes: [],
  connections: [],
};

const initialState: QueryBuilderState = {
  currentPattern: initialPattern,
  selectedNodeIds: [],
  selectedConnectionIds: [],
  canvasWidth: 1200,
  canvasHeight: 800,
  zoom: 1,
  panX: 0,
  panY: 0,
  showNodePalette: true,
  showPropertyPanel: false,
  generatedCypher: "",
  isValidQuery: false,
  queryErrors: [],
  savedQueries: [],
  availableNodeTypes: [
    "Person", "Organization", "Product", "Location", "Event", "Concept"
  ],
  availableRelationshipTypes: [
    "KNOWS", "WORKS_FOR", "LOCATED_IN", "CREATED", "USES", "RELATED_TO"
  ],
  availableProperties: {
    Person: ["name", "age", "email", "title"],
    Organization: ["name", "industry", "size", "founded"],
    Product: ["name", "category", "price", "version"],
    Location: ["name", "country", "coordinates", "population"],
    Event: ["name", "date", "type", "duration"],
    Concept: ["name", "category", "description"],
  },
};

export const useQueryBuilderStore = create<QueryBuilderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Pattern manipulation
      addNode: (nodeData) => {
        const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const node: QueryNode = {
          ...nodeData,
          id,
          variable: nodeData.variable || `${nodeData.type}_${id.split('_')[1]}`,
        };

        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            nodes: [...state.currentPattern.nodes, node],
          },
        }));

        get().generateCypher();
        return id;
      },

      updateNode: (id, updates) => {
        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            nodes: state.currentPattern.nodes.map(node =>
              node.id === id ? { ...node, ...updates } : node
            ),
          },
        }));
        get().generateCypher();
      },

      removeNode: (id) => {
        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            nodes: state.currentPattern.nodes.filter(node => node.id !== id),
            connections: state.currentPattern.connections.filter(
              conn => conn.sourceId !== id && conn.targetId !== id
            ),
          },
          selectedNodeIds: state.selectedNodeIds.filter(nodeId => nodeId !== id),
        }));
        get().generateCypher();
      },

      duplicateNode: (id) => {
        const state = get();
        const originalNode = state.currentPattern.nodes.find(n => n.id === id);
        if (!originalNode) return "";

        const newId = get().addNode({
          ...originalNode,
          x: originalNode.x + 50,
          y: originalNode.y + 50,
          variable: undefined, // Will be auto-generated
        });

        return newId;
      },

      addConnection: (connectionData) => {
        const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const connection: QueryConnection = {
          ...connectionData,
          id,
        };

        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            connections: [...state.currentPattern.connections, connection],
          },
        }));

        get().generateCypher();
        return id;
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            connections: state.currentPattern.connections.map(conn =>
              conn.id === id ? { ...conn, ...updates } : conn
            ),
          },
        }));
        get().generateCypher();
      },

      removeConnection: (id) => {
        set((state) => ({
          currentPattern: {
            ...state.currentPattern,
            connections: state.currentPattern.connections.filter(conn => conn.id !== id),
          },
          selectedConnectionIds: state.selectedConnectionIds.filter(connId => connId !== id),
        }));
        get().generateCypher();
      },

      // Selection
      selectNode: (id, multi = false) => {
        set((state) => ({
          selectedNodeIds: multi
            ? state.selectedNodeIds.includes(id)
              ? state.selectedNodeIds.filter(nodeId => nodeId !== id)
              : [...state.selectedNodeIds, id]
            : [id],
          selectedConnectionIds: multi ? state.selectedConnectionIds : [],
        }));
      },

      selectConnection: (id, multi = false) => {
        set((state) => ({
          selectedConnectionIds: multi
            ? state.selectedConnectionIds.includes(id)
              ? state.selectedConnectionIds.filter(connId => connId !== id)
              : [...state.selectedConnectionIds, id]
            : [id],
          selectedNodeIds: multi ? state.selectedNodeIds : [],
        }));
      },

      clearSelection: () => {
        set({
          selectedNodeIds: [],
          selectedConnectionIds: [],
        });
      },

      selectAll: () => {
        const state = get();
        set({
          selectedNodeIds: state.currentPattern.nodes.map(n => n.id),
          selectedConnectionIds: state.currentPattern.connections.map(c => c.id),
        });
      },

      // Canvas operations
      setCanvasSize: (width, height) => {
        set({ canvasWidth: width, canvasHeight: height });
      },

      setZoom: (zoom) => {
        set({ zoom: Math.max(0.1, Math.min(3, zoom)) });
      },

      setPan: (x, y) => {
        set({ panX: x, panY: y });
      },

      resetView: () => {
        set({ zoom: 1, panX: 0, panY: 0 });
      },

      // UI state
      toggleNodePalette: () => {
        set((state) => ({ showNodePalette: !state.showNodePalette }));
      },

      togglePropertyPanel: () => {
        set((state) => ({ showPropertyPanel: !state.showPropertyPanel }));
      },

      // Query generation
      generateCypher: () => {
        const state = get();
        const { nodes, connections } = state.currentPattern;

        if (nodes.length === 0) {
          set({ generatedCypher: "", isValidQuery: false, queryErrors: [] });
          return "";
        }

        try {
          let cypherParts: string[] = [];

          // Build MATCH clauses
          const matchClauses: string[] = [];
          
          // Add standalone nodes
          nodes.forEach(node => {
            if (node.type === "entity") {
              let nodePattern = `(${node.variable}`;
              if (node.label) {
                nodePattern += `:${node.label}`;
              }
              if (node.properties && Object.keys(node.properties).length > 0) {
                const props = Object.entries(node.properties)
                  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                  .join(", ");
                nodePattern += ` {${props}}`;
              }
              nodePattern += ")";
              
              // Check if this node is part of any connection
              const hasConnections = connections.some(conn => 
                conn.sourceId === node.id || conn.targetId === node.id
              );
              
              if (!hasConnections) {
                matchClauses.push(nodePattern);
              }
            }
          });

          // Add connected patterns
          connections.forEach(connection => {
            const sourceNode = nodes.find(n => n.id === connection.sourceId);
            const targetNode = nodes.find(n => n.id === connection.targetId);
            
            if (sourceNode && targetNode && connection.type === "path") {
              let pattern = `(${sourceNode.variable}`;
              if (sourceNode.label) pattern += `:${sourceNode.label}`;
              pattern += ")";

              if (connection.label) {
                pattern += `-[:${connection.label}]->`;
              } else {
                pattern += "->";
              }

              pattern += `(${targetNode.variable}`;
              if (targetNode.label) pattern += `:${targetNode.label}`;
              pattern += ")";

              matchClauses.push(pattern);
            }
          });

          if (matchClauses.length > 0) {
            cypherParts.push(`MATCH ${matchClauses.join(", ")}`);
          }

          // Add WHERE clauses for constraints
          const whereConditions: string[] = [];
          nodes.forEach(node => {
            if (node.constraints) {
              node.constraints.forEach(constraint => {
                const condition = `${node.variable}.${constraint.property} ${constraint.operator} ${JSON.stringify(constraint.value)}`;
                whereConditions.push(condition);
              });
            }
          });

          if (whereConditions.length > 0) {
            cypherParts.push(`WHERE ${whereConditions.join(" AND ")}`);
          }

          // Add RETURN clause
          const returnNodes = nodes.filter(n => n.type === "return" || n.type === "entity");
          if (returnNodes.length > 0) {
            const returnVars = returnNodes.map(n => n.variable).join(", ");
            cypherParts.push(`RETURN ${returnVars}`);
          } else if (nodes.length > 0) {
            // Default return all nodes
            const allVars = nodes.map(n => n.variable).join(", ");
            cypherParts.push(`RETURN ${allVars}`);
          }

          const cypher = cypherParts.join("\n");
          
          set({
            generatedCypher: cypher,
            isValidQuery: cypher.trim().length > 0,
            queryErrors: [],
          });

          return cypher;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          set({
            generatedCypher: "",
            isValidQuery: false,
            queryErrors: [errorMessage],
          });
          return "";
        }
      },

      validateQuery: () => {
        get().generateCypher();
        return get().isValidQuery;
      },

      // Persistence
      saveQuery: (name, description) => {
        const state = get();
        const id = `query_${Date.now()}`;
        const savedQuery: SavedQuery = {
          id,
          name,
          description,
          pattern: { ...state.currentPattern },
          cypherQuery: state.generatedCypher,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        set((state) => ({
          savedQueries: [...state.savedQueries, savedQuery],
        }));

        return id;
      },

      loadQuery: (id) => {
        const state = get();
        const savedQuery = state.savedQueries.find(q => q.id === id);
        if (savedQuery) {
          set({
            currentPattern: { ...savedQuery.pattern },
            generatedCypher: savedQuery.cypherQuery,
          });
          get().clearSelection();
        }
      },

      deleteQuery: (id) => {
        set((state) => ({
          savedQueries: state.savedQueries.filter(q => q.id !== id),
        }));
      },

      duplicateQuery: (id) => {
        const state = get();
        const originalQuery = state.savedQueries.find(q => q.id === id);
        if (originalQuery) {
          return get().saveQuery(
            `${originalQuery.name} (Copy)`,
            originalQuery.description
          );
        }
        return "";
      },

      // Import/Export
      exportPattern: () => {
        const state = get();
        return JSON.stringify({
          pattern: state.currentPattern,
          cypher: state.generatedCypher,
        }, null, 2);
      },

      importPattern: (data) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.pattern) {
            set({
              currentPattern: parsed.pattern,
              generatedCypher: parsed.cypher || "",
            });
            get().clearSelection();
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Reset
      clearPattern: () => {
        set({
          currentPattern: initialPattern,
          selectedNodeIds: [],
          selectedConnectionIds: [],
          generatedCypher: "",
          isValidQuery: false,
          queryErrors: [],
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: "query-builder-storage",
      partialize: (state) => ({
        savedQueries: state.savedQueries,
        showNodePalette: state.showNodePalette,
        showPropertyPanel: state.showPropertyPanel,
      }),
    }
  )
);