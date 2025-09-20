import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseApi } from "../services/databaseApi";
import type { Database, DatabaseCreate, DatabaseUpdate } from "@/entities/database";

// Query keys for database management
export const DATABASE_QUERY_KEYS = {
  all: ['databases'] as const,
  lists: () => [...DATABASE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...DATABASE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...DATABASE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DATABASE_QUERY_KEYS.details(), id] as const,
  stats: (id: string) => [...DATABASE_QUERY_KEYS.detail(id), 'stats'] as const,
  schema: (id: string) => [...DATABASE_QUERY_KEYS.detail(id), 'schema'] as const,
};

// Hook to get all databases
export function useDatabases() {
  return useQuery({
    queryKey: DATABASE_QUERY_KEYS.lists(),
    queryFn: databaseApi.getDatabases,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get a specific database
export function useDatabase(databaseId: string) {
  return useQuery({
    queryKey: DATABASE_QUERY_KEYS.detail(databaseId),
    queryFn: () => databaseApi.getDatabase(databaseId),
    enabled: !!databaseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to get database statistics
export function useDatabaseStats(databaseId: string) {
  return useQuery({
    queryKey: DATABASE_QUERY_KEYS.stats(databaseId),
    queryFn: () => databaseApi.getDatabaseStats(databaseId),
    enabled: !!databaseId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to get database schema
export function useDatabaseSchema(databaseId: string) {
  return useQuery({
    queryKey: DATABASE_QUERY_KEYS.schema(databaseId),
    queryFn: () => databaseApi.getDatabaseSchema(databaseId),
    enabled: !!databaseId,
    staleTime: 10 * 60 * 1000, // 10 minutes (schema doesn't change often)
  });
}

// Hook to create a database
export function useCreateDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: DatabaseCreate) => databaseApi.createDatabase(data),
    onSuccess: () => {
      // Invalidate and refetch databases list
      queryClient.invalidateQueries({ queryKey: DATABASE_QUERY_KEYS.lists() });
    },
  });
}

// Hook to update a database
export function useUpdateDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ databaseId, data }: { databaseId: string; data: DatabaseUpdate }) =>
      databaseApi.updateDatabase(databaseId, data),
    onSuccess: (updatedDatabase) => {
      // Update the specific database in cache
      queryClient.setQueryData(
        DATABASE_QUERY_KEYS.detail(updatedDatabase.id),
        updatedDatabase
      );
      
      // Update the database in the list cache
      queryClient.setQueryData(
        DATABASE_QUERY_KEYS.lists(),
        (oldData: Database[] | undefined) => {
          if (!oldData) return [updatedDatabase];
          return oldData.map((db) =>
            db.id === updatedDatabase.id ? updatedDatabase : db
          );
        }
      );
    },
  });
}

// Hook to delete a database
export function useDeleteDatabase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (databaseId: string) => databaseApi.deleteDatabase(databaseId),
    onSuccess: (_, databaseId) => {
      // Remove the database from list cache
      queryClient.setQueryData(
        DATABASE_QUERY_KEYS.lists(),
        (oldData: Database[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((db) => db.id !== databaseId);
        }
      );
      
      // Remove specific database cache
      queryClient.removeQueries({ queryKey: DATABASE_QUERY_KEYS.detail(databaseId) });
      queryClient.removeQueries({ queryKey: DATABASE_QUERY_KEYS.stats(databaseId) });
      queryClient.removeQueries({ queryKey: DATABASE_QUERY_KEYS.schema(databaseId) });
    },
  });
}

// Hook to upload file to database
export function useUploadDatabaseFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      databaseId, 
      file, 
      onProgress 
    }: { 
      databaseId: string; 
      file: File; 
      onProgress?: (progress: number) => void;
    }) => databaseApi.uploadFile(databaseId, file, onProgress),
    onSuccess: (_, { databaseId }) => {
      // Invalidate database data to refresh after file upload
      queryClient.invalidateQueries({ queryKey: DATABASE_QUERY_KEYS.detail(databaseId) });
      queryClient.invalidateQueries({ queryKey: DATABASE_QUERY_KEYS.stats(databaseId) });
      queryClient.invalidateQueries({ queryKey: DATABASE_QUERY_KEYS.schema(databaseId) });
    },
  });
}

// Hook for database operations - combines all mutations
export function useDatabaseOperations() {
  const createDatabase = useCreateDatabase();
  const updateDatabase = useUpdateDatabase();
  const deleteDatabase = useDeleteDatabase();
  const uploadFile = useUploadDatabaseFile();
  
  return {
    createDatabase: createDatabase.mutate,
    updateDatabase: updateDatabase.mutate,
    deleteDatabase: deleteDatabase.mutate,
    uploadFile: uploadFile.mutate,
    
    // Loading states
    isCreating: createDatabase.isPending,
    isUpdating: updateDatabase.isPending,
    isDeleting: deleteDatabase.isPending,
    isUploading: uploadFile.isPending,
    
    // Error states
    createError: createDatabase.error,
    updateError: updateDatabase.error,
    deleteError: deleteDatabase.error,
    uploadError: uploadFile.error,
    
    // Reset functions
    resetCreateError: createDatabase.reset,
    resetUpdateError: updateDatabase.reset,
    resetDeleteError: deleteDatabase.reset,
    resetUploadError: uploadFile.reset,
  };
}