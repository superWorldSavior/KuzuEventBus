// Database management feature - barrel export

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

// Export components (migrated from old structure)
export { DatabaseList } from "./components/DatabaseList";