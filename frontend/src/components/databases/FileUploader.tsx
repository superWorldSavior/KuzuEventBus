import { useState, useRef, useCallback } from "react";
import {
  Upload,
  File,
  X,
  CheckCircle,
  Warning,
  CloudArrowUp,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

interface FileUploaderProps {
  onUpload?: (files: File[]) => Promise<void>;
  onFileComplete?: (file: FileUploadItem) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export function FileUploader({
  onUpload,
  onFileComplete,
  acceptedTypes = [".csv", ".json", ".txt", ".cypher"],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 5,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      errors.push(`Maximum ${maxFiles} files allowed`);
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
      alert(errors.join('\n')); // In production, use a proper toast/notification
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);

    // Auto-start upload if onUpload is provided
    if (onUpload && validFiles.length > 0) {
      startUpload(validFiles);
    }
  }, [files.length, maxFiles, onUpload]);

  const startUpload = async (filesToUpload: FileUploadItem[]) => {
    for (const fileItem of filesToUpload) {
      setFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: "uploading" as const }
            : f
        )
      );

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileItem.id 
                ? { ...f, progress }
                : f
            )
          );
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Mark as completed
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: "completed" as const, progress: 100 }
              : f
          )
        );

        onFileComplete?.(fileItem);
      } catch (error) {
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: "error" as const, 
                  errorMessage: error instanceof Error ? error.message : "Upload failed"
                }
              : f
          )
        );
      }
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: FileUploadItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <Warning className="w-5 h-5 text-red-500" />;
      case "uploading":
        return (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          "cursor-pointer"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudArrowUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to upload
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Supported formats: {acceptedTypes.join(', ')}
        </p>
        <p className="text-xs text-gray-400">
          Max file size: {Math.round(maxFileSize / (1024 * 1024))}MB • Max files: {maxFiles}
        </p>
        
        <Button className="mt-4">
          <Upload className="w-4 h-4 mr-2" />
          Choose Files
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Files ({files.length})
          </h4>
          
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {getStatusIcon(fileItem.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileItem.file.size)}
                  </p>
                </div>
                
                {fileItem.status === "uploading" && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}
                
                {fileItem.status === "error" && fileItem.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">
                    {fileItem.errorMessage}
                  </p>
                )}
                
                {fileItem.status === "completed" && (
                  <p className="text-xs text-green-600 mt-1">
                    Upload completed
                  </p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(fileItem.id)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

FileUploader.displayName = "FileUploader";