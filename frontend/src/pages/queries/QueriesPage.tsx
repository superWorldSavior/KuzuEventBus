import React, { useState } from "react";
import { 
  Play, 
  FloppyDisk as Save,
  Clock, 
  Database as DatabaseIcon, 
  Plus,
  Folder,
  Star,
  FileText,
  Code,
  Copy
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { useRecentQueries, useDatabases } from "@/hooks/useApi";

// Monaco Editor component (simplified for now)
function CypherEditor({ 
  value, 
  onChange, 
  height = "300px" 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  height?: string; 
}) {
  return (
    <div className="border border-gray-300 rounded-md">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Cypher Query</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-700 text-xs">Cypher</Badge>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ height }}
        placeholder="MATCH (n:Person) RETURN n.name LIMIT 10"
      />
    </div>
  );
}

interface QueryResult {
  id: string;
  status: "success" | "error" | "running";
  executionTime?: number;
  resultCount?: number;
  error?: string;
  data?: Array<Record<string, any>>;
}

export function QueriesPage() {
  const [currentQuery, setCurrentQuery] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [savedQueries] = useState([
    {
      id: "1",
      name: "Top 10 Users",
      query: "MATCH (n:Person) RETURN n.name, n.age ORDER BY n.age DESC LIMIT 10",
      database: "social-network",
      createdAt: new Date(Date.now() - 86400000),
      favorite: true
    },
    {
      id: "2", 
      name: "Product Categories",
      query: "MATCH (p:Product)-[:BELONGS_TO]->(c:Category) RETURN c.name, COUNT(p) as productCount",
      database: "ecommerce",
      createdAt: new Date(Date.now() - 172800000),
      favorite: false
    }
  ]);

  const { data: recentQueries = [] } = useRecentQueries();
  const { data: databases = [] } = useDatabases();

  const executeQuery = async () => {
    if (!currentQuery.trim() || !selectedDatabase) return;

    setQueryResult({ id: Date.now().toString(), status: "running" });

    // Simulate query execution
    setTimeout(() => {
      const mockResult: QueryResult = {
        id: Date.now().toString(),
        status: "success",
        executionTime: Math.floor(Math.random() * 200) + 50,
        resultCount: Math.floor(Math.random() * 100) + 1,
        data: [
          { "n.name": "Alice", "n.age": 30 },
          { "n.name": "Bob", "n.age": 25 },
          { "n.name": "Charlie", "n.age": 35 },
        ]
      };
      setQueryResult(mockResult);
    }, 1000 + Math.random() * 2000);
  };

  const loadQuery = (query: string) => {
    setCurrentQuery(query);
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Query Console</h1>
          <p className="text-gray-600">Build and execute Cypher queries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Query
          </Button>
          <Button variant="outline" size="sm">
            <Folder className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Saved Queries & History */}
        <div className="space-y-6">
          {/* Database Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Database
            </label>
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose database...</option>
              {databases.map((db: any) => (
                <option key={db.id} value={db.id}>
                  {db.displayName || db.name}
                </option>
              ))}
            </select>
          </div>

          {/* Saved Queries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Saved Queries</h3>
              <Button size="sm" variant="ghost" className="text-xs">
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>
            <div className="space-y-2">
              {savedQueries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadQuery(query.query)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {query.name}
                        </span>
                        {query.favorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {query.query}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge className="bg-gray-100 text-gray-600 text-xs">
                          {query.database}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {query.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Queries */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Queries</h3>
            <div className="space-y-2">
              {recentQueries.slice(0, 5).map((query: any) => (
                <div
                  key={query.id}
                  className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer text-xs"
                  onClick={() => loadQuery(query.query)}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <Badge className={cn(
                      "text-xs",
                      query.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {query.status}
                    </Badge>
                  </div>
                  <p className="text-gray-600 line-clamp-2 font-mono">
                    {query.query}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-500">{query.database}</span>
                    <span className="text-gray-400">
                      {formatExecutionTime(query.executionTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Query Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Query Editor */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Query Editor</h2>
              <div className="flex items-center space-x-2">
                {selectedDatabase && (
                  <div className="flex items-center space-x-2">
                    <DatabaseIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {databases.find((db: any) => db.id === selectedDatabase)?.displayName || selectedDatabase}
                    </span>
                  </div>
                )}
                <Button 
                  onClick={executeQuery}
                  disabled={!currentQuery.trim() || !selectedDatabase || queryResult?.status === "running"}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {queryResult?.status === "running" ? "Running..." : "Run Query"}
                </Button>
              </div>
            </div>
            
            <CypherEditor 
              value={currentQuery}
              onChange={setCurrentQuery}
              height="200px"
            />
          </div>

          {/* Query Results */}
          {queryResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Results</h2>
                <div className="flex items-center space-x-4">
                  {queryResult.status === "success" && (
                    <>
                      <div className="text-sm text-gray-600">
                        {queryResult.resultCount} rows in {formatExecutionTime(queryResult.executionTime!)}
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        <Button size="sm" variant="outline">
                          Export
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border border-gray-300 rounded-md">
                {queryResult.status === "running" && (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Executing query...</span>
                    </div>
                  </div>
                )}

                {queryResult.status === "error" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-red-600 text-sm font-medium">Query Error</div>
                    </div>
                    <pre className="text-sm text-red-700 font-mono">
                      {queryResult.error || "An unexpected error occurred"}
                    </pre>
                  </div>
                )}

                {queryResult.status === "success" && queryResult.data && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(queryResult.data[0] || {}).map((key) => (
                            <th key={key} className="px-4 py-2 text-left font-medium text-gray-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.data.map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-gray-900">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
