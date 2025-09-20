// Database entity barrel exports
export type { 
  Database,
  DatabaseCreate,
  DatabaseUpdate,
  DatabaseStats,
  DatabaseSchema as DatabaseSchemaModel,
  DatabaseTable,
  DatabaseColumn,
  DatabaseRelationship
} from "./model";

export { 
  DatabaseSchema,
  DatabaseCreateSchema,
  DatabaseUpdateSchema,
  DatabaseStatsSchema,
  DatabaseColumnSchema,
  DatabaseTableSchema,
  DatabaseRelationshipSchema,
  DatabaseSchemaSchema,
  type DatabaseSchemaType,
  type DatabaseCreateSchemaType,
  type DatabaseUpdateSchemaType
} from "./schema";

// Database constants
export const DATABASE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MAX_DATABASE_NAME_LENGTH = 100;
export const MAX_DATABASE_DESCRIPTION_LENGTH = 500;

export const DATABASE_RELATIONSHIP_TYPES = [
  "one-to-one",
  "one-to-many", 
  "many-to-many"
] as const;