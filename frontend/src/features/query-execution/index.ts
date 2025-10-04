// Query execution feature - barrel export (YAGNI simplified)

// Export types
export * from "./types";

// Export API services (only queryApi is used)
export { queryApi, QueryExecutionAPI } from "./services/queryApi";

// All hooks removed (YAGNI - not used, dashboard uses queryApi directly)
// All components removed (YAGNI - dashboard uses custom QueryEditor from @/features/graph)