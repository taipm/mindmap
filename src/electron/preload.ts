import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (filename: string, content: string) =>
    ipcRenderer.invoke('save-file', filename, content),

  openFile: () =>
    ipcRenderer.invoke('open-file'),

  exportImage: (filename: string, dataUrl: string, format: 'png' | 'svg') =>
    ipcRenderer.invoke('export-image', filename, dataUrl, format),
});
