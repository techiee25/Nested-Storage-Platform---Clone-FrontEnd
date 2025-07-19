import React, { useState } from "react";
import { isZipFile, parseZipFile } from "./utils";
import { Upload, FileText, Database, AlertCircle, CheckCircle } from "lucide-react";

interface FileItem {
  name: string;
  type: "file";
  fileType: "csv" | "pdf";
  file: File;
  createdAt: string;
  modifiedBy: string;
}

interface FolderItem {
  name: string;
  type: "folder";
  children: (FileItem | FolderItem)[];
  createdAt: string;
  modifiedBy: string;
}


interface UploadZipProps {
  onStructureReady: (structure: FolderItem) => void;
}

const UploadZip: React.FC<UploadZipProps> = ({ onStructureReady }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [dragActive, setDragActive] = useState(false);

  const handleZipUpload = async (file: File) => {
    if (!isZipFile(file)) {
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const rootFolder = await parseZipFile(file, "You");
      onStructureReady(rootFolder as FolderItem);
      setUploadStatus("success");
    } catch (error) {
      setUploadStatus("error");
      console.error("Error processing ZIP file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleZipUpload(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragActive to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleZipUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-slate-400 bg-white"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${dragActive ? "bg-blue-100" : "bg-slate-100"}`}>
              <Upload className={`w-8 h-8 ${dragActive ? "text-blue-600" : "text-slate-600"}`} />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {isUploading ? "Processing ZIP file..." : "Upload ZIP Archive"}
            </h3>
            <p className="text-slate-600 mb-4">
              Drag and drop your ZIP file here, or click to browse
            </p>
            
            {!isUploading && (
              <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {uploadStatus === "success" && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Upload successful!</p>
            <p className="text-sm text-green-700">Your ZIP file has been processed and is ready to explore.</p>
          </div>
        </div>
      )}

      {uploadStatus === "error" && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Upload failed</p>
            <p className="text-sm text-red-700">There was an error processing your ZIP file. Please try again.</p>
          </div>
        </div>
      )}

      {/* Supported File Types */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h4 className="font-medium text-slate-900 mb-3">Supported File Types</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">CSV Files</p>
              <p className="text-sm text-slate-600">Comma-separated values with interactive table view</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">PDF Files</p>
              <p className="text-sm text-slate-600">Portable documents with page navigation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadZip;