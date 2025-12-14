import { contextBridge, ipcRenderer } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { dialog } from 'electron';
import path from 'path';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: async (filename: string, content: string) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (!result.canceled) {
        await writeFile(result.filePath, content, 'utf-8');
        return { success: true, path: result.filePath };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  openFile: async () => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const content = await readFile(result.filePaths[0], 'utf-8');
        return { success: true, content, path: result.filePaths[0] };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  exportImage: async (filename: string, dataUrl: string, format: 'png' | 'svg') => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: format.toUpperCase() + ' Files', extensions: [format] }],
      });

      if (!result.canceled) {
        if (format === 'png') {
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          await writeFile(result.filePath, Buffer.from(base64Data, 'base64'));
        } else {
          await writeFile(result.filePath, dataUrl, 'utf-8');
        }
        return { success: true, path: result.filePath };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
});
