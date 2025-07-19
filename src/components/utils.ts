import Papa from "papaparse";
import JSZip from "jszip";

// Download file from URL helper
export const downloadFileURL = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
};

// CSV parsing helper
export const parseCsvFile = (file: File): Promise<{ data: any[]; columns: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        if (parsed.errors.length > 0) {
          reject("Error parsing CSV file");
        } else {
          resolve({
            data: parsed.data,
            columns: parsed.meta.fields || [],
          });
        }
      } catch (err) {
        reject("Failed to load CSV file");
      }
    };
    reader.readAsText(file);
  });
};

// CSV export helper
export const exportCsvData = (data: any[], fileName: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
};

// ZIP file type check
export const isZipFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const hasZipExtension = fileName.endsWith('.zip');
  const validMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'multipart/x-zip'
  ];
  const hasValidMimeType = validMimeTypes.includes(file.type) || file.type === '';
  return hasZipExtension && (hasValidMimeType || file.type === '');
};

// ZIP parsing helper (returns folder structure)
export const parseZipFile = async (file: File, modifiedBy = "You") => {
  const zip = await JSZip.loadAsync(file);

  const rootFolder = {
    name: file.name.replace(/\.zip$/, ""),
    type: "folder",
    children: [],
    createdAt: new Date(file.lastModified).toISOString(), // Use file's last modified date
    modifiedBy,
  };

  const folderMap = new Map<string, any>();
  folderMap.set("", rootFolder);

  for (const relativePath in zip.files) {
    const entry = zip.files[relativePath];
    const parts = relativePath.split("/").filter(Boolean);
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");

    const parentFolder = folderMap.get(parentPath);
    if (!parentFolder) continue;

    const createdAt = entry.date?.toISOString?.() || new Date().toISOString(); // Safe fallback

    if (entry.dir) {
      const newFolder = {
        name,
        type: "folder",
        children: [],
        createdAt,
        modifiedBy,
      };
      parentFolder.children.push(newFolder);
      folderMap.set(parts.join("/"), newFolder);
    } else {
      const ext = name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "pdf") {
        const fileBlob = await entry.async("blob");
        const fileObj = new File([fileBlob], name, { type: fileBlob.type });
        const fileItem = {
          name,
          type: "file",
          fileType: ext,
          file: fileObj,
          createdAt,
          modifiedBy,
        };
        parentFolder.children.push(fileItem);
      }
    }
  }

  return rootFolder;
};

// File tree helpers
export const getFileCount = (node: any): number => {
  if (node.type === "file") return 1;
  return node.children.reduce((count: number, child: any) => count + getFileCount(child), 0);
};

export const filterAndSortTree = (node: any, searchQuery: string, sortBy: "name" | "createdAt"): any[] => {
  if (node.type === "file") {
    return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? [node] : [];
  }
  let filteredChildren = node.children.flatMap((child: any) =>
    filterAndSortTree(child, searchQuery, sortBy)
  );
  const folders = filteredChildren.filter((child: any) => child.type === "folder");
  const files = filteredChildren.filter((child: any) => child.type === "file");
  const compareFn = (a: any, b: any) =>
    sortBy === "name"
      ? a.name.localeCompare(b.name)
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  folders.sort(compareFn);
  files.sort(compareFn);
  const sortedChildren = [...folders, ...files];
  return sortedChildren.length > 0 ? [{ ...node, children: sortedChildren }] : [];
};
