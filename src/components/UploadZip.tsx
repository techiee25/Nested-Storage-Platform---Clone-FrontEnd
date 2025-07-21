import React, { useState } from "react";
import { Upload, FileText, Database, AlertCircle, CheckCircle } from "lucide-react";

interface UploadZipProps {
  onStructureReady: (structure: any, fileContents: Record<string, any>) => void;
}

const UploadZip: React.FC<UploadZipProps> = ({ onStructureReady }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const isZipFile = (file: File): boolean => {
    return file.type === "application/zip" || 
           file.type === "application/x-zip-compressed" ||
           file.type === "application/octet-stream" || // Some browsers use this for ZIP files
           file.name.toLowerCase().endsWith('.zip');
  };

  const handleZipUpload = async (file: File) => {
    console.log("📁 File selected:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!isZipFile(file)) {
      setUploadStatus("error");
      setErrorMessage(`Invalid file type. Selected: ${file.type || 'unknown'}. Please select a ZIP file.`);
      return;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setUploadStatus("error");
      setErrorMessage(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`);
      return;
    }

    if (file.size === 0) {
      setUploadStatus("error");
      setErrorMessage("Empty file selected. Please choose a valid ZIP file.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");
    setUploadProgress("Preparing upload...");

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('zipFile', file); // Make sure field name matches multer config
      formData.append('uploaderName', 'Current User');

      console.log("🚀 Starting upload...");
      setUploadProgress("Uploading file...");

      const response = await fetch("http://localhost:5000/api/files/upload", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let browser set it for FormData
      });

      console.log("📡 Response status:", response.status);
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        throw new Error("Invalid server response");
      }

      console.log("📦 Server response:", result);

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      if (result.success) {
        console.log("✅ Upload successful:", {
          totalFiles: Object.keys(result.data.fileContents || {}).length,
          structure: result.data.structure
        });
        
        setUploadProgress("Processing file contents...");
        
        // Convert base64 file contents back to usable format for frontend
        const processedFileContents: Record<string, File> = {};
        
        if (result.data.fileContents) {
          Object.entries(result.data.fileContents).forEach(([path, fileData]: [string, any]) => {
            try {
              // Convert base64 back to blob for frontend consumption
              const byteCharacters = atob(fileData.content);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              
              // Create File object
              const fileName = path.split('/').pop() || 'unknown';
              const mimeType = fileData.type === 'csv' ? 'text/csv' : 
                             fileData.type === 'pdf' ? 'application/pdf' : 
                             'application/octet-stream';
              const fileBlob = new File([byteArray], fileName, { type: mimeType });
              
              processedFileContents[path] = fileBlob;
            } catch (conversionError) {
              console.error(`❌ Error converting file ${path}:`, conversionError);
            }
          });
        }

        // Attach file objects to the structure
        const attachFilesToStructure = (node: any): any => {
          if (node.type === "file" && node.path && processedFileContents[node.path]) {
            return { 
              ...node, 
              file: processedFileContents[node.path]
            };
          }
          if (node.type === "folder" && Array.isArray(node.children)) {
            return {
              ...node,
              children: node.children.map(attachFilesToStructure),
            };
          }
          return node;
        };

        const hydratedStructure = attachFilesToStructure(result.data.structure);
        
        console.log("🎉 Structure hydrated with files:", Object.keys(processedFileContents).length);
        
        onStructureReady(hydratedStructure, processedFileContents);
        setUploadStatus("success");
        setUploadProgress("");
      } else {
        throw new Error(result.message || 'Upload processing failed');
      }

    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      
      let errorMsg = "Failed to process ZIP file. Please try again.";
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg = "Cannot connect to server. Please check if the server is running on localhost:5000.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setUploadStatus("error");
      setErrorMessage(errorMsg);
      setUploadProgress("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleZipUpload(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
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
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 bg-white"
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
              {isUploading ? uploadProgress || "Processing ZIP file..." : "Upload ZIP Archive"}
            </h3>
            <p className="text-slate-600 mb-4">
              Drag and drop your ZIP file here, or click to browse
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Maximum file size: 50MB • Supported files: CSV, PDF
            </p>
            {!isUploading && (
              <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
                <input 
                  type="file" 
                  accept=".zip,application/zip,application/x-zip-compressed" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  disabled={isUploading} 
                />
              </label>
            )}
          </div>
        </div>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              {uploadProgress && (
                <p className="text-sm text-slate-600">{uploadProgress}</p>
              )}
            </div>
          </div>
        )}
      </div>

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
            <p className="text-sm text-red-700 whitespace-pre-wrap">
              {errorMessage || "There was an error processing your ZIP file. Please try again."}
            </p>
          </div>
        </div>
      )}

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