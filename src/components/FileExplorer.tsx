import  { useState } from "react";
import FileNode from "./FileNode";
import { Search, SortAsc, FolderOpen, RotateCcw } from "lucide-react";
import { getFileCount, filterAndSortTree } from "./utils";

const FileExplorer = ({ tree, onFileClick }: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");

  // filterAndSortTree imported from utils.ts

  const filteredTree = searchQuery ? filterAndSortTree(tree, searchQuery, sortBy)[0] : tree;

  const clearSearch = () => {
    setSearchQuery("");
  };

  // getFileCount imported from utils.ts

  const totalFiles = getFileCount(tree);
  const filteredFiles = filteredTree ? getFileCount(filteredTree) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <FolderOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">File Explorer</h2>
            <p className="text-xs text-slate-600">
              {searchQuery ? `${filteredFiles} of ${totalFiles} files` : `${totalFiles} files`}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="p-4 space-y-3 border-b border-slate-200">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <SortAsc className="w-4 h-4" />
            <span>Sort by:</span>
          </div>
          <select
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "createdAt")}
          >
            <option value="name">Name (A-Z)</option>
            <option value="createdAt">Date Created</option>
          </select>
        </div>
      </div>

      {/* File Tree */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4">
          {filteredTree ? (
            <FileNode node={filteredTree} onFileClick={onFileClick} />
          ) : (
            <div className="text-center py-8">
              <div className="p-3 bg-slate-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm">No files found matching "{searchQuery}"</p>
              <button
                onClick={clearSearch}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;