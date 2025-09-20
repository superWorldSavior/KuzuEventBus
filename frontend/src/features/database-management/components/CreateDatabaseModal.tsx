import { useState } from "react";
import { X, Database, Upload } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FileUploader } from "./FileUploader";
import { cn } from "@/utils";

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type CreationMethod = "empty" | "upload";

export function CreateDatabaseModal({ isOpen, onClose, onSuccess }: CreateDatabaseModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>("empty");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call for database creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form
      setName("");
      setDescription("");
      setCreationMethod("empty");
      setUploadedFiles([]);
      onSuccess();
    } catch (error) {
      console.error("Failed to create database:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setUploadedFiles(files);
  };

  const canSubmit = name.trim() && (creationMethod === "empty" || uploadedFiles.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            Create New Database
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Database Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., social-network, inventory-system"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your database"
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Creation Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Creation Method</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCreationMethod("empty")}
                className={cn(
                  "p-4 border rounded-lg text-left transition-all",
                  creationMethod === "empty"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Database className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">Empty Database</h4>
                <p className="text-sm text-gray-500">
                  Start with an empty database and add data later
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCreationMethod("upload")}
                className={cn(
                  "p-4 border rounded-lg text-left transition-all",
                  creationMethod === "upload"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Upload className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900 mb-1">Upload Data</h4>
                <p className="text-sm text-gray-500">
                  Create database from CSV, JSON, or Cypher files
                </p>
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          {creationMethod === "upload" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Files</h3>
              <FileUploader
                onUpload={handleFileUpload}
                acceptedTypes={[".csv", ".json", ".cypher", ".txt"]}
                maxFileSize={50 * 1024 * 1024} // 50MB
                maxFiles={10}
              />
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !canSubmit}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Creating...
                </>
              ) : (
                "Create Database"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}