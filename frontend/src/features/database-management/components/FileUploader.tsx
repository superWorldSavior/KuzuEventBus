import React, { useState, useRef, useCallback } from "react";
import {
  File,
  X,
  CheckCircle,
  CloudArrowUp,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { useUploadFile } from "@/shared/hooks/useApi";

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

interface FileUploaderProps {
  // Legacy support - if no databaseId provided, use legacy mode
  databaseId?: string;
  onUpload?: (files: File[]) => Promise<void>;
  onFileComplete?: (file: FileUploadItem) => void;
  // Enhanced support
  onUploadComplete?: (fileId: string, fileName: string) => void;
  onUploadError?: (fileName: string, error: string) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export function FileUploader({
  databaseId,
  onUpload,
  onFileComplete,
  onUploadComplete,
  onUploadError,
  acceptedTypes = [".csv", ".json", ".txt", ".cypher", ".kuzu"],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 5,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const uploadMutation = useUploadFile();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`;
    }

    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    // Check max files limit
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    newFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push({
          id: generateFileId(),
          file,
          progress: 0,
          status: "pending",
        });
      }
    });

    if (errors.length > 0) {
      alert(`File validation errors:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setFiles((prev: FileUploadItem[]) => [...prev, ...validFiles]);
      
      // Use enhanced upload if databaseId is provided, otherwise use legacy
      if (databaseId) {
        validFiles.forEach(fileItem => {
          startEnhancedUpload(fileItem);
        });
      } else if (onUpload) {
        startLegacyUpload(validFiles);
      }
    }
  }, [files.length, maxFiles, databaseId, onUpload]);

  const startEnhancedUpload = async (fileItem: FileUploadItem) => {
    if (!databaseId) return;

    // Update status to uploading
    setFiles((prev: FileUploadItem[]) => 
      prev.map((f: FileUploadItem) => 
        f.id === fileItem.id 
          ? { ...f, status: "uploading" as const }
          : f
      )
    );

    try {
      await uploadMutation.mutateAsync({
        databaseId,
        file: fileItem.file,
        onProgress: (progress: number) => {
          setFiles((prev: FileUploadItem[]) => 
            prev.map((f: FileUploadItem) => 
              f.id === fileItem.id 
                ? { ...f, progress }
                : f
            )
          );
        },
      });

      // Mark as completed
      setFiles((prev: FileUploadItem[]) => 
        prev.map((f: FileUploadItem) => 
          f.id === fileItem.id 
            ? { ...f, status: "completed" as const, progress: 100 }
            : f
        )
      );

      console.log(`Upload successful: ${fileItem.file.name}`);
      onUploadComplete?.(fileItem.id, fileItem.file.name);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      
      setFiles((prev: FileUploadItem[]) => 
        prev.map((f: FileUploadItem) => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: "error" as const, 
                errorMessage,
                progress: 0
              }
            : f
        )
      );

      console.error(`Upload failed for ${fileItem.file.name}:`, errorMessage);
      onUploadError?.(fileItem.file.name, errorMessage);
    }
  };

  const startLegacyUpload = async (filesToUpload: FileUploadItem[]) => {
    if (!onUpload) return;

    for (const fileItem of filesToUpload) {
      setFiles((prev: FileUploadItem[]) => 
        prev.map((f: FileUploadItem) => 
          f.id === fileItem.id 
            ? { ...f, status: "uploading" as const }
            : f
        )
      );

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setFiles((prev: FileUploadItem[]) => 
            prev.map((f: FileUploadItem) => 
              f.id === fileItem.id 
                ? { ...f, progress }
                : f
            )
          );
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Mark as completed
        setFiles((prev: FileUploadItem[]) => 
          prev.map((f: FileUploadItem) => 
            f.id === fileItem.id 
              ? { ...f, status: "completed" as const, progress: 100 }
              : f
          )
        );

        onFileComplete?.(fileItem);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        setFiles((prev: FileUploadItem[]) => 
          prev.map((f: FileUploadItem) => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: "error" as const, 
                  errorMessage,
                  progress: 0
                }
              : f
          )
        );
      }
    }
  };

  const retryUpload = (fileId: string) => {
    const fileItem = files.find((f: FileUploadItem) => f.id === fileId);
    if (fileItem) {
      if (databaseId) {
        startEnhancedUpload(fileItem);
      } else {
        startLegacyUpload([fileItem]);
      }
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev: FileUploadItem[]) => prev.filter((f: FileUploadItem) => f.id !== fileId));
  };

  const clearCompleted = () => {
    setFiles((prev: FileUploadItem[]) => prev.filter((f: FileUploadItem) => f.status !== "completed"));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={20} className="text-green-500" />;
      case "error":
        return <WarningCircle size={20} className="text-red-500" />;
      case "uploading":
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <File size={20} className="text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedCount = files.filter(f => f.status === "completed").length;
  const uploadingCount = files.filter(f => f.status === "uploading").length;
  const errorCount = files.filter(f => f.status === "error").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudArrowUp size={48} className="mx-auto mb-4 text-gray-400" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports: {acceptedTypes.join(', ')} • Max {Math.round(maxFileSize / (1024 * 1024))}MB per file • Up to {maxFiles} files
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Statistics */}
      {files.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-gray-600">
              Total: <span className="font-medium">{files.length}</span>
            </span>
            {completedCount > 0 && (
              <span className="text-green-600">
                Completed: <span className="font-medium">{completedCount}</span>
              </span>
            )}
            {uploadingCount > 0 && (
              <span className="text-blue-600">
                Uploading: <span className="font-medium">{uploadingCount}</span>
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600">
                Errors: <span className="font-medium">{errorCount}</span>
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            {completedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompleted}
              >
                Clear Completed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getStatusIcon(fileItem.status)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(fileItem.file.size)}</span>
                    {fileItem.status === "uploading" && (
                      <span>• {fileItem.progress}%</span>
                    )}
                    {fileItem.status === "error" && fileItem.errorMessage && (
                      <span className="text-red-500">• {fileItem.errorMessage}</span>
                    )}
                  </div>
                  
                  {fileItem.status === "uploading" && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {fileItem.status === "error" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retryUpload(fileItem.id)}
                    disabled={uploadMutation.isPending}
                  >
                    Retry
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(fileItem.id)}
                  disabled={fileItem.status === "uploading"}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}