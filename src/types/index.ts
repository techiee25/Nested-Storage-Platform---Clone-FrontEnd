export interface FolderItem {
  _id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FolderItem[];
  createdAt: string;
  modifiedBy?: string;
}


