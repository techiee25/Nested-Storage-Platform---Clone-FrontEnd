import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export const uploadZip = (formData: FormData) => API.post('/upload', formData);
export const getStructure = () => API.get('/structure');
export const getFile = (id: string) => API.get(`/file/${id}`);
export const getFileContent = (id: string) => API.get(`/file/${id}/content`);
export const renameItem = (id: string, name: string) => API.patch(`/item/${id}/rename`, { name });
export const deleteItem = (id: string) => API.delete(`/item/${id}`);
export const uploadToFolder = (formData: FormData, folderId: string) =>
  API.post(`/upload/${folderId}`, formData);
export const search = (query: string) => API.get(`/search?q=${query}`);
