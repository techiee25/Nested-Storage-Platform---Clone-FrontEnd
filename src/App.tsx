import { useState } from "react";
import UploadZip from "./components/UploadZip";
import FileExplorer from "./components/FileExplorer";
import CsvViewer from "./components/CsvViewer";
import PdfViewer from "./components/PdfViewer";
import { FolderOpen, File, Database } from "lucide-react";

export default function App() {
  const [structure, setStructure] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileContents, setFileContents] = useState<Record<string, File>>({});
  const [error, setError] = useState<string>("");

  const handleFileClick = (file: any) => setSelectedFile(file);

  const handleStructureReady = (
    newStructure: any,
    newFileContents: Record<string, File>
  ) => {
    setStructure(newStructure);
    setFileContents(newFileContents);
    setSelectedFile(null);
    setError("");
  };

  const clearData = () => {
    setStructure(null);
    setSelectedFile(null);
    setFileContents({});
    setError("");
  };

  const getFileStats = (node: any): { files: number; folders: number } => {
    if (node.type === "file") return { files: 1, folders: 0 };

    return (node.children || []).reduce(
      (acc: any, child: any) => {
        const stats = getFileStats(child);
        return {
          files: acc.files + stats.files,
          folders: acc.folders + stats.folders,
        };
      },
      { files: 0, folders: 1 } // current folder
    );
  };

  const stats = structure ? getFileStats(structure) : { files: 0, folders: 0 };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 z-10 w-full">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Nested Folder Viewer
                </h1>
                <p className="text-sm text-slate-600">
                  Upload ZIP files to explore contents
                </p>
              </div>
            </div>

            {structure && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-6 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4" />
                    <span>{stats.folders - 1} folders</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <File className="w-4 h-4" />
                    <span>{stats.files} files</span>
                  </div>
                </div>
                <button
                  onClick={clearData}
                  className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                >
                  Upload New
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow overflow-hidden w-full">
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!structure ? (
          <div className="h-full w-full overflow-auto p-6 flex justify-center items-center">
            <div className="w-full max-w-3xl">
              <UploadZip onStructureReady={handleStructureReady} />
            </div>
          </div>
        ) : (
          <div className="h-full w-full grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
            {/* Sidebar */}
            <div className="lg:col-span-1 overflow-y-auto max-h-full">
              <FileExplorer tree={structure} onFileClick={handleFileClick} />
            </div>

            {/* Content Viewer */}
            <div className="lg:col-span-3 overflow-y-auto max-h-full">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                {/* Content Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  {selectedFile ? (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {selectedFile.fileType === "csv" ? (
                          <Database className="w-5 h-5 text-blue-600" />
                        ) : (
                          <File className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900">
                          {selectedFile.name}
                        </h2>
                        <p className="text-sm text-slate-600">
                          {selectedFile.fileType.toUpperCase()} • Modified by{" "}
                          {selectedFile.modifiedBy} •{" "}
                          {new Date(selectedFile.createdAt).toLocaleDateString()}
                          {selectedFile.size &&
                            ` • ${(selectedFile.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <File className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        No file selected
                      </h3>
                      <p className="text-slate-600">
                        Choose a file from the sidebar to preview its contents
                      </p>
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-auto flex-grow">
                  {selectedFile?.fileType === "csv" && selectedFile.file && (
                    <CsvViewer file={selectedFile.file} />
                  )}
                  {selectedFile?.fileType === "pdf" && selectedFile.file && (
                    <PdfViewer file={selectedFile.file} />
                  )}
                  {selectedFile && !selectedFile.file && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <File className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600">File content not available</p>
                        <p className="text-sm text-slate-500 mt-1">
                          The file may not have been processed correctly
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
