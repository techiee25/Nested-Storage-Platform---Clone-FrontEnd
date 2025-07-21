import { useEffect, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, X, Eye, EyeOff, Settings, Zap } from "lucide-react";

// Types
interface CsvRow {
  [key: string]: string | number;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface ColumnFilter {
  column: string;
  value: string;
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "greater" | "less";
}

interface CsvViewerProps {
  file?: File;
}

// Robust CSV parser that handles quoted fields and embedded commas
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes ("")
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add the last field
  result.push(current.trim());
  return result;
};

const parseCsvFile = async (file: File): Promise<{ data: CsvRow[]; columns: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error("CSV file is empty");
        }

        // Parse header row
        const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"(.*)"$/, '$1').trim());
        
        // Parse data rows
        const data: CsvRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const row: CsvRow = {};
          
          headers.forEach((header, index) => {
            let value = values[index] || '';
            // Remove surrounding quotes if present
            value = value.replace(/^"(.*)"$/, '$1').trim();
            
            // Try to convert to number if it looks like a number
            const numValue = Number(value);
            if (!isNaN(numValue) && value !== '' && !isNaN(parseFloat(value))) {
              row[header] = numValue;
            } else {
              row[header] = value;
            }
          });
          
          // Only add row if it has at least one non-empty value
          if (Object.values(row).some(val => val !== '')) {
            data.push(row);
          }
        }
        
        resolve({ data, columns: headers });
      } catch (error) {
        reject(error instanceof Error ? error.message : "Failed to parse CSV file");
      }
    };
    
    reader.onerror = () => reject("Failed to read file");
    reader.readAsText(file);
  });
};

const exportCsvData = (data: CsvRow[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = String(row[header] || '');
        // Escape quotes and wrap in quotes if the value contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function CsvViewer({ file }: CsvViewerProps) {
  const [data, setData] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<CsvRow[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [selectedFilterColumn, setSelectedFilterColumn] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced mock file for demo with properly quoted CSV data
  const mockFile = new File([
    'Index,Customer Id,First Name,Last Name,Company,City,Country,Phone 1,Phone 2\n' +
    '1,2d08FB17EE273F4,Aimee,Downs,"Steele Group",Chavezborough,"Bosnia and Herzegovina",(283)437-3886x8321,999-728-1637\n' +
    '2,EA4d384DfDbBf77,Darren,Peck,"Lester, Woodard and Mitchell","Lake Ana","Pitcairn Islands",(496)452-6181x,(496)452-6181x\n' +
    '3,0e04Fde9f225dE,Brett,Mullen,"Sanford, Davenport and Giles",Kimport,Bulgaria,001-583-352-710,001-583-352-710\n' +
    '4,C2dE4dEcc489ae0,Sheryl,Meyers,Browning-Simon,Robersonstad,Cyprus,854-138-4911x5772,+1-448-910-2237\n' +
    '5,8C2811a503C7c5a,Michelle,Gallagher,Beck-Hendrix,Elaineberg,Timor-Leste,739.218.2516x459,001-054-401-0209'
  ], 'sample.csv', { type: 'text/csv' });

  useEffect(() => {
    const fileToUse = file || mockFile;
    setLoading(true);
    setError(null);
    
    parseCsvFile(fileToUse)
      .then(({ data, columns }) => {
        setData(data);
        setFilteredData(data);
        setColumns(columns);
        setVisibleColumns(columns.reduce((acc, col) => ({ ...acc, [col]: true }), {}));
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Failed to load CSV file");
        setLoading(false);
      });
  }, [file]);

  useEffect(() => {
    let filtered = [...data];

    // Apply global search filter
    if (globalSearchQuery) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(globalSearchQuery.toLowerCase())
        )
      );
    }

    // Apply column-specific filters
    columnFilters.forEach(filter => {
      if (filter.value) {
        filtered = filtered.filter((row) => {
          const cellValue = String(row[filter.column] || '').toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case "contains":
              return cellValue.includes(filterValue);
            case "equals":
              return cellValue === filterValue;
            case "startsWith":
              return cellValue.startsWith(filterValue);
            case "endsWith":
              return cellValue.endsWith(filterValue);
            case "greater":
              return Number(row[filter.column]) > Number(filterValue);
            case "less":
              return Number(row[filter.column]) < Number(filterValue);
            default:
              return cellValue.includes(filterValue);
          }
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle numeric sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }
        
        // Handle string sorting
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, globalSearchQuery, columnFilters, sortConfig]);

  const handleSort = (column: string): void => {
    setSortConfig((current) => ({
      key: column,
      direction: current?.key === column && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (column: string): JSX.Element => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  const addColumnFilter = (column: string, value: string, operator: ColumnFilter['operator'] = "contains"): void => {
    const existingFilterIndex = columnFilters.findIndex(f => f.column === column);
    
    if (existingFilterIndex >= 0) {
      const newFilters = [...columnFilters];
      newFilters[existingFilterIndex] = { column, value, operator };
      setColumnFilters(newFilters);
    } else {
      setColumnFilters([...columnFilters, { column, value, operator }]);
    }
  };

  const removeColumnFilter = (column: string): void => {
    setColumnFilters(columnFilters.filter(f => f.column !== column));
  };

  const clearAllFilters = (): void => {
    setColumnFilters([]);
    setGlobalSearchQuery("");
  };

  const toggleColumnVisibility = (column: string): void => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const getActiveFiltersCount = (): number => {
    return columnFilters.length + (globalSearchQuery ? 1 : 0);
  };

  const exportData = (): void => {
    const filename = file ? `filtered_${file.name}` : 'filtered_data.csv';
    exportCsvData(filteredData, filename);
  };

  const goToPage = (page: number): void => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getOperatorDisplay = (operator: ColumnFilter['operator']): string => {
    const operatorMap: Record<ColumnFilter['operator'], string> = {
      contains: "Contains",
      equals: "Equals",
      startsWith: "Starts with",
      endsWith: "Ends with",
      greater: "Greater than",
      less: "Less than"
    };
    return operatorMap[operator];
  };

  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Loading CSV data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">{error}</div>
        <p className="text-slate-600">Please check your CSV file format and try again.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);
  const visibleColumnsList = columns.filter(col => visibleColumns[col]);

  return (
    <div className="space-y-4 p-4">
      {/* Enhanced Control Panel */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          {/* Global Search */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search across all columns..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-80 shadow-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
              <Filter className="w-4 h-4" />
              <span>{filteredData.length} of {data.length} rows</span>
              {getActiveFiltersCount() > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {getActiveFiltersCount()} active
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                showFilterPanel 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Smart Filters</span>
            </button>
            
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center space-x-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
            
            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Smart Filter Panel */}
        {showFilterPanel && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Advanced Column Filters</span>
              </h3>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Filter */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
              <select
                value={selectedFilterColumn}
                onChange={(e) => setSelectedFilterColumn(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select column...</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              
              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="operator-select"
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
              </select>
              
              <input
                type="text"
                placeholder="Filter value..."
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="filter-value"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedFilterColumn) {
                    const operatorSelect = document.getElementById('operator-select') as HTMLSelectElement;
                    const valueInput = document.getElementById('filter-value') as HTMLInputElement;
                    addColumnFilter(selectedFilterColumn, valueInput.value, operatorSelect.value as ColumnFilter['operator']);
                    valueInput.value = '';
                    setSelectedFilterColumn('');
                  }
                }}
              />
              
              <button
                onClick={() => {
                  const operatorSelect = document.getElementById('operator-select') as HTMLSelectElement;
                  const valueInput = document.getElementById('filter-value') as HTMLInputElement;
                  if (selectedFilterColumn && valueInput.value) {
                    addColumnFilter(selectedFilterColumn, valueInput.value, operatorSelect.value as ColumnFilter['operator']);
                    valueInput.value = '';
                    setSelectedFilterColumn('');
                  }
                }}
                disabled={!selectedFilterColumn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Add Filter
              </button>
            </div>

            {/* Active Filters */}
            {columnFilters.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Active Filters:</h4>
                <div className="flex flex-wrap gap-2">
                  {columnFilters.map((filter, index) => (
                    <div key={index} className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">{filter.column}</span>
                      <span className="text-xs text-blue-600">{getOperatorDisplay(filter.operator)}</span>
                      <span className="text-sm text-blue-700">"{filter.value}"</span>
                      <button
                        onClick={() => removeColumnFilter(filter.column)}
                        className="text-blue-500 hover:text-blue-700 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Column Visibility & Settings */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-sm text-slate-600 font-medium">Columns:</span>
          {columns.map((column) => (
            <button
              key={column}
              onClick={() => toggleColumnVisibility(column)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                visibleColumns[column]
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300 border border-slate-300'
              }`}
            >
              {visibleColumns[column] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{column}</span>
            </button>
          ))}
        </div>

        {/* Items per page */}
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-sm text-slate-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-slate-600">rows per page</span>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                {visibleColumnsList.map((column, index) => (
                  <th key={index} className="px-6 py-4 text-left">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors rounded-lg px-3 py-2 group"
                      onClick={() => handleSort(column)}
                    >
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {column}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {getSortIcon(column)}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentData.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  {visibleColumnsList.map((column, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 text-sm text-slate-900">
                      <div className="truncate max-w-xs" title={String(row[column] || "")}>
                        {String(row[column] || "")}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> of <span className="font-medium">{filteredData.length}</span> results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              First
            </button>
            
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {(() => {
                const maxVisiblePages = 5;
                const halfVisible = Math.floor(maxVisiblePages / 2);
                let startPage = Math.max(1, currentPage - halfVisible);
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }
                
                return pages.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                      pageNum === currentPage
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Next
            </button>
            
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
};