import { VisualQueryBuilder } from "@/components/query-builder";
import { useQueryBuilderStore } from "@/store/queryBuilder";
import { useEffect } from "react";

export function QueryBuilderDemo() {
  const { clearPattern, addNode, addConnection } = useQueryBuilderStore();

  // Add some demo nodes when component mounts
  useEffect(() => {
    clearPattern();

    // Add demo entities
    const personId = addNode({
      type: "entity",
      label: "Person",
      x: 200,
      y: 150,
      variable: "person",
      properties: { name: "John Doe", age: 30 },
    });

    const companyId = addNode({
      type: "entity", 
      label: "Company",
      x: 400,
      y: 150,
      variable: "company",
      properties: { name: "Tech Corp", industry: "Technology" },
    });

    // Add a relationship
    setTimeout(() => {
      addConnection({
        sourceId: personId,
        targetId: companyId,
        type: "path",
        label: "WORKS_FOR",
        properties: { since: "2020" },
      });
    }, 500);
  }, [clearPattern, addNode, addConnection]);

  return (
    <div className="h-screen w-full">
      <VisualQueryBuilder />
    </div>
  );
}

QueryBuilderDemo.displayName = "QueryBuilderDemo";