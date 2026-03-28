import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Menu, Tray, nativeImage } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const trayIconPath = path.join(__dirname, '..', 'resources', 'tray-icon-template.png');

function createFallbackTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
    <path fill="#000" d="M9 2a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Zm5 7a1 1 0 1 0-2 0 3 3 0 1 1-6 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V16H6.5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H10v-2.1A5 5 0 0 0 14 9Z"/>
  </svg>`;

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
}

function createTrayIcon() {
  const fileIcon = nativeImage.createFromPath(trayIconPath);
  const icon = fileIcon.isEmpty() ? createFallbackTrayIcon() : fileIcon;
  const sizedIcon = icon.resize({ height: process.platform === 'darwin' ? 18 : 16 });
  if (process.platform === 'darwin') {
    sizedIcon.setTemplateImage(true);
  }
  return sizedIcon;
}

export function createTray({ app, getMainWindow, onTriggerShortcut, onTriggerTranslateShortcut }) {
  if (process.platform !== 'darwin' && process.platform !== 'win32') return null;

  const tray = new Tray(createTrayIcon());
  tray.setToolTip('Volo');

  const showMainWindow = () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  };

  const hideMainWindow = () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    mainWindow.hide();
  };

  const toggleMainWindow = () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }
    showMainWindow();
  };

  const buildContextMenu = () => {
    const mainWindow = getMainWindow();
    const isVisible = Boolean(mainWindow?.isVisible());
    return Menu.buildFromTemplate([
      {
        label: isVisible ? '隐藏窗口' : '显示窗口',
        click: () => {
          if (isVisible) {
            hideMainWindow();
            return;
          }
          showMainWindow();
        },
      },
      {
        label: '触发语音输入',
        click: () => void onTriggerShortcut(),
      },
      ...(onTriggerTranslateShortcut
        ? [
            {
              label: '触发翻译',
              click: () => void onTriggerTranslateShortcut(),
            },
          ]
        : []),
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]);
  };

  tray.setContextMenu(buildContextMenu());
  tray.on('right-click', () => {
    tray.setContextMenu(buildContextMenu());
  });
  tray.on('click', () => {
    if (process.platform === 'darwin') {
      showMainWindow();
      return;
    }
    toggleMainWindow();
  });

  return tray;
}
