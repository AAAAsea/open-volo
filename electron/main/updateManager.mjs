import updaterPkg from 'electron-updater';

const { autoUpdater } = updaterPkg;

const SUPPORTED_PLATFORMS = new Set(['darwin', 'win32']);
const STARTUP_CHECK_DELAY_MS = 15_000;
const PERIODIC_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function normalizeReleaseDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function stripHtml(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanupReleaseText(text) {
  const normalized = decodeHtmlEntities(stripHtml(text))
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalized;
}

function normalizeReleaseNotes(releaseNotes) {
  if (typeof releaseNotes === 'string') {
    const raw = releaseNotes.trim();
    if (!raw) return '';
    const cleaned = cleanupReleaseText(raw);
    if (!cleaned || /^Full Changelog:/i.test(cleaned)) {
      return '';
    }
    return raw;
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .map((item) => {
        if (!item) return '';
        const version = item.version ? `v${item.version}` : '';
        const rawNote = typeof item.note === 'string' ? item.note.trim() : '';
        const cleaned = rawNote ? cleanupReleaseText(rawNote) : '';
        if (!cleaned || /^Full Changelog:/i.test(cleaned)) {
          return '';
        }
        const note = rawNote;
        return [version, note].filter(Boolean).join('\n');
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message || String(error);
  }
  return String(error || '未知错误');
}

function createInitialState(app) {
  const packaged = app.isPackaged;
  const platformSupported = SUPPORTED_PLATFORMS.has(process.platform);
  const supported = packaged && platformSupported;
  return {
    supported,
    status: supported ? 'idle' : 'unsupported',
    currentVersion: app.getVersion(),
    latestVersion: '',
    checking: false,
    updateAvailable: false,
    downloading: false,
    downloaded: false,
    downloadPercent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    lastCheckedAt: '',
    releaseDate: '',
    releaseNotes: '',
    error: supported
      ? ''
      : packaged
        ? '当前平台暂不支持端内更新。'
        : '开发环境不检查更新，请使用打包产物验证更新流程。',
  };
}

export function createUpdateManager({ app, send }) {
  let state = createInitialState(app);
  let checkPromise = null;
  let downloadPromise = null;
  let startupTimer = null;
  let intervalTimer = null;

  const broadcastState = () => {
    send('voice:update-state', state);
  };

  const setState = (patch) => {
    state = {
      ...state,
      ...patch,
      currentVersion: app.getVersion(),
    };
    broadcastState();
    return state;
  };

  const getState = () => ({ ...state });

  const resetTimers = () => {
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }
    if (intervalTimer) {
      clearInterval(intervalTimer);
      intervalTimer = null;
    }
  };

  const getUnsupportedError = () => {
    if (app.isPackaged) {
      return '当前平台暂不支持端内更新。';
    }
    return '开发环境不检查更新，请使用打包产物验证更新流程。';
  };

  const applyUpdateInfo = (info = {}) => ({
    latestVersion: String(info.version || ''),
    releaseDate: normalizeReleaseDate(info.releaseDate),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  });

  const ensureSupported = () => {
    if (state.supported) return null;
    return getUnsupportedError();
  };

  const checkForUpdates = async ({ manual = false } = {}) => {
    const unsupportedError = ensureSupported();
    if (unsupportedError) {
      const nextState = setState({
        status: 'unsupported',
        checking: false,
        error: unsupportedError,
      });
      return { ok: false, error: unsupportedError, state: nextState };
    }

    if (checkPromise) {
      return { ok: true, state: getState() };
    }

    try {
      checkPromise = autoUpdater.checkForUpdates();
      await checkPromise;
      return { ok: true, state: getState() };
    } catch (error) {
      const message = normalizeError(error);
      const nextState = setState({
        status: 'error',
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        error: message,
      });
      if (manual) {
        console.warn('[Volo] Manual update check failed:', message);
      }
      return { ok: false, error: message, state: nextState };
    } finally {
      checkPromise = null;
    }
  };

  const downloadUpdate = async () => {
    const unsupportedError = ensureSupported();
    if (unsupportedError) {
      const nextState = setState({
        status: 'unsupported',
        error: unsupportedError,
      });
      return { ok: false, error: unsupportedError, state: nextState };
    }

    if (state.downloaded) {
      return { ok: true, state: getState() };
    }

    if (!state.updateAvailable) {
      return { ok: false, error: '当前没有可下载的更新。', state: getState() };
    }

    if (downloadPromise) {
      return { ok: true, state: getState() };
    }

    try {
      downloadPromise = autoUpdater.downloadUpdate();
      await downloadPromise;
      return { ok: true, state: getState() };
    } catch (error) {
      const message = normalizeError(error);
      const nextState = setState({
        status: 'error',
        downloading: false,
        error: message,
      });
      return { ok: false, error: message, state: nextState };
    } finally {
      downloadPromise = null;
    }
  };

  const installUpdate = async () => {
    if (!state.downloaded) {
      return { ok: false, error: '更新尚未下载完成。', state: getState() };
    }

    const inApplicationsFolder =
      process.platform !== 'darwin' ||
      typeof app.isInApplicationsFolder !== 'function' ||
      app.isInApplicationsFolder();

    if (!inApplicationsFolder) {
      const message = 'macOS 自动更新要求应用位于 Applications 文件夹，请先移动应用后再安装更新。';
      const nextState = setState({
        status: 'error',
        error: message,
      });
      return { ok: false, error: message, state: nextState };
    }

    console.log('[Volo] installUpdate requested', {
      currentVersion: app.getVersion(),
      downloaded: state.downloaded,
      latestVersion: state.latestVersion,
      inApplicationsFolder,
    });

    setState({
      status: 'installing',
      downloading: false,
      checking: false,
      error: '',
    });

    setTimeout(() => {
      console.log('[Volo] calling autoUpdater.quitAndInstall()');
      autoUpdater.quitAndInstall(false, true);
    }, 100);

    return { ok: true, state: getState() };
  };

  const initialize = () => {
    if (!state.supported) {
      broadcastState();
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => {
      setState({
        status: 'checking',
        checking: true,
        error: '',
      });
    });

    autoUpdater.on('update-available', (info) => {
      setState({
        status: 'available',
        checking: false,
        updateAvailable: true,
        downloaded: false,
        downloading: false,
        downloadPercent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        lastCheckedAt: new Date().toISOString(),
        error: '',
        ...applyUpdateInfo(info),
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      setState({
        status: 'up-to-date',
        checking: false,
        updateAvailable: false,
        downloaded: false,
        downloading: false,
        downloadPercent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        lastCheckedAt: new Date().toISOString(),
        error: '',
        ...applyUpdateInfo(info),
      });
    });

    autoUpdater.on('download-progress', (progress) => {
      setState({
        status: 'downloading',
        checking: false,
        updateAvailable: true,
        downloading: true,
        downloaded: false,
        downloadPercent: Number(progress.percent || 0),
        downloadedBytes: Number(progress.transferred || 0),
        totalBytes: Number(progress.total || 0),
        error: '',
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Volo] Auto update downloaded:', {
        version: info?.version,
        files: Array.isArray(info?.files) ? info.files.map((file) => file.url || file.info?.url).filter(Boolean) : [],
      });
      setState({
        status: 'downloaded',
        checking: false,
        updateAvailable: true,
        downloading: false,
        downloaded: true,
        downloadPercent: 100,
        downloadedBytes: Number(state.totalBytes || state.downloadedBytes || 0),
        lastCheckedAt: new Date().toISOString(),
        error: '',
        ...applyUpdateInfo(info),
      });
    });

    autoUpdater.on('error', (error) => {
      const message = normalizeError(error);
      console.error('[Volo] Auto update error:', message);
      setState({
        status: 'error',
        checking: false,
        downloading: false,
        lastCheckedAt: new Date().toISOString(),
        error: message,
      });
    });

    autoUpdater.on('before-quit-for-update', () => {
      console.log('[Volo] before-quit-for-update fired');
    });

    broadcastState();

    startupTimer = setTimeout(() => {
      void checkForUpdates();
    }, STARTUP_CHECK_DELAY_MS);

    intervalTimer = setInterval(() => {
      void checkForUpdates();
    }, PERIODIC_CHECK_INTERVAL_MS);
  };

  const destroy = () => {
    resetTimers();
  };

  return {
    initialize,
    destroy,
    getState,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
