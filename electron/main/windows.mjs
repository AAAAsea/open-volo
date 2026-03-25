import { BrowserWindow } from 'electron';

function isBlockedZoomShortcut(input) {
  const usesCommand = Boolean(input.control || input.meta);
  if (!usesCommand || input.alt) return false;

  const key = String(input.key || '').toLowerCase();
  const code = String(input.code || '');
  return (
    key === '+' ||
    key === '=' ||
    key === '-' ||
    key === '_' ||
    key === '0' ||
    code === 'Equal' ||
    code === 'Minus' ||
    code === 'Digit0' ||
    code === 'NumpadAdd' ||
    code === 'NumpadSubtract' ||
    code === 'Numpad0'
  );
}

export function createMainWindow({
  isDev,
  rendererUrl,
  rendererIndexPath,
  preloadPath,
  onClose,
  onClosed,
  onMove,
}) {
  const mainWindow = new BrowserWindow({
    width: 952,
    height: 602,
    x: 200,
    y: 120,
    title: 'Volo',
    resizable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    backgroundColor: '#f3f4f6',
    titleBarStyle: 'default',
    autoHideMenuBar: process.platform !== 'darwin',
    skipTaskbar: process.platform !== 'darwin',
    minWidth: 920,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(rendererIndexPath);
  }

  mainWindow.webContents.setZoomFactor(1);
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isBlockedZoomShortcut(input)) return;
    event.preventDefault();
    mainWindow.webContents.setZoomFactor(1);
  });

  if (onClose) {
    mainWindow.on('close', onClose);
  }
  if (onClosed) {
    mainWindow.on('closed', onClosed);
  }
  if (onMove) {
    mainWindow.on('move', onMove);
  }

  return mainWindow;
}
