import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { readFile, writeFile } from 'node:fs/promises';

let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../react-app/build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

// IPC Handlers
ipcMain.handle('save-file', async (_event, filename: string, content: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
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
});

ipcMain.handle('open-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
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
});

ipcMain.handle('export-image', async (_event, filename: string, dataUrl: string, format: 'png' | 'svg') => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
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
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
