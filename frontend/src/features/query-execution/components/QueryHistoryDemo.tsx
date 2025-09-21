// Example integration of QueryHistory component
import { useState } from "react";
import { QueryHistory } from "./QueryHistory";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Database } from "@phosphor-icons/react";
import type { Query } from "@/entities/query";

export function QueryHistoryDemo() {
  const [selectedDatabase, setSelectedDatabase] = useState<string | undefined>("db-1");
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);

  // Mock database options
  const databases = [
    { id: "db-1", name: "Customer Database" },
    { id: "db-2", name: "Analytics Database" },
    { id: "db-3", name: "Testing Database" },
  ];

  const handleQuerySelect = (query: Query) => {
    setSelectedQuery(query);
    console.log("Selected query:", query);
  };

  const handleRunQuery = (queryContent: string) => {
    console.log("Running query:", queryContent);
    // This would typically trigger the query executor
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Query History</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Database</CardTitle>
              <CardDescription>Choose a database to view its query history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {databases.map((db) => (
                <Button
                  key={db.id}
                  variant={selectedDatabase === db.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDatabase(db.id)}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {db.name}
                </Button>
              ))}
              <Button
                variant={selectedDatabase === undefined ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedDatabase(undefined)}
              >
                None Selected
              </Button>
            </CardContent>
          </Card>

          {/* Selected Query Details */}
          {selectedQuery && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Query</CardTitle>
                <CardDescription>Query details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm font-medium">Status:</div>
                  <div className="text-sm text-muted-foreground">{selectedQuery.status}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Duration:</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedQuery.durationMs ? `${selectedQuery.durationMs}ms` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Created:</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedQuery.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Query:</div>
                  <div className="text-xs font-mono bg-muted p-2 rounded mt-1">
                    {selectedQuery.content}
                  </div>
                </div>
                {selectedQuery.errorMessage && (
                  <div>
                    <div className="text-sm font-medium text-destructive">Error:</div>
                    <div className="text-xs text-destructive">
                      {selectedQuery.errorMessage}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Query History Component */}
        <div className="lg:col-span-2">
          <QueryHistory
            databaseId={selectedDatabase}
            limit={50}
            onQuerySelect={handleQuerySelect}
            onRunQuery={handleRunQuery}
          />
        </div>
      </div>
    </div>
  );
}