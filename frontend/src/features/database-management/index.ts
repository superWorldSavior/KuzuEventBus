// Database management feature - barrel export (YAGNI simplified)

// Export types
export * from "./types";

// Export API services
export { databaseApi } from "./services/databaseApi";

// Export hooks
export {
  useDatabases,
  useCreateDatabase,
  useUpdateDatabase,
  useDeleteDatabase,
  useDatabaseOperations,
  useDatabaseSchema
} from "./hooks/useDatabases";
export { useDatabasePitr } from "./hooks/useDatabasePitr";

// Components removed (YAGNI - not used in simplified dashboard)