import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('volo', {
  platform: process.platform,
  setShortcut: (payload) => ipcRenderer.invoke('voice:set-shortcut', payload),
  setTranslateShortcut: (payload) => ipcRenderer.invoke('voice:set-translate-shortcut', payload),
  beginShortcutCapture: () => ipcRenderer.invoke('voice:begin-shortcut-capture'),
  endShortcutCapture: () => ipcRenderer.invoke('voice:end-shortcut-capture'),
  startShortcutHold: (payload) => ipcRenderer.invoke('voice:start-shortcut-hold', payload),
  endShortcutHold: (payload) => ipcRenderer.invoke('voice:end-shortcut-hold', payload),
  endTranslateHold: (payload) => ipcRenderer.invoke('voice:end-translate-hold', payload),
  cancelRecording: (payload) => ipcRenderer.invoke('voice:cancel-recording', payload),
  getRuntimeConfig: () => ipcRenderer.invoke('voice:get-runtime-config'),
  getDebugState: () => ipcRenderer.invoke('voice:get-debug-state'),
  getUpdateState: () => ipcRenderer.invoke('voice:get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('voice:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('voice:download-update'),
  installUpdate: () => ipcRenderer.invoke('voice:install-update'),
  clearDebugLogs: () => ipcRenderer.invoke('voice:clear-debug-logs'),
  setRuntimeConfig: (payload) => ipcRenderer.invoke('voice:set-runtime-config', payload),
  triggerShortcut: (payload) => ipcRenderer.invoke('voice:trigger-shortcut', payload),
  setShortcutPreviewMode: (payload) => ipcRenderer.invoke('voice:set-shortcut-preview-mode', payload),
  submitAudio: (payload) => ipcRenderer.invoke('voice:submit-audio', payload),
  reportAudioLevel: (payload) => ipcRenderer.send('voice:report-audio-level', payload),
  reportAudioSpectrum: (payload) => ipcRenderer.send('voice:report-audio-spectrum', payload),
  notifyCaptureReady: () => ipcRenderer.send('voice:capture-ready'),
  notifyCaptureFailed: () => ipcRenderer.send('voice:capture-failed'),
  onAudioRequest: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:audio-request', listener);
    return () => ipcRenderer.removeListener('voice:audio-request', listener);
  },
  onInputHint: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:input-hint', listener);
    return () => ipcRenderer.removeListener('voice:input-hint', listener);
  },
  getPermissions: () => ipcRenderer.invoke('voice:get-permissions'),
  requestPermission: (payload) => ipcRenderer.invoke('voice:request-permission', payload),
  openPermissions: (payload) => ipcRenderer.invoke('voice:open-permissions', payload),
  onPermissions: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:permissions', listener);
    return () => ipcRenderer.removeListener('voice:permissions', listener);
  },
  onStatus: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:status', listener);
    return () => ipcRenderer.removeListener('voice:status', listener);
  },
  onAudioLevel: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:audio-level', listener);
    return () => ipcRenderer.removeListener('voice:audio-level', listener);
  },
  onTranscription: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:transcription', listener);
    return () => ipcRenderer.removeListener('voice:transcription', listener);
  },
  onShortcutApplied: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:shortcut-applied', listener);
    return () => ipcRenderer.removeListener('voice:shortcut-applied', listener);
  },
  onShortcutCaptured: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:shortcut-captured', listener);
    return () => ipcRenderer.removeListener('voice:shortcut-captured', listener);
  },
  onShortcutPreview: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:shortcut-preview', listener);
    return () => ipcRenderer.removeListener('voice:shortcut-preview', listener);
  },
  onTranslateShortcutApplied: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:translate-shortcut-applied', listener);
    return () => ipcRenderer.removeListener('voice:translate-shortcut-applied', listener);
  },
  onDebugLogEntry: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:debug-log-entry', listener);
    return () => ipcRenderer.removeListener('voice:debug-log-entry', listener);
  },
  onDebugLogsCleared: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:debug-logs-cleared', listener);
    return () => ipcRenderer.removeListener('voice:debug-logs-cleared', listener);
  },
  onUpdateState: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('voice:update-state', listener);
    return () => ipcRenderer.removeListener('voice:update-state', listener);
  },
  debugLog: (payload) => ipcRenderer.send('voice:debug-log', payload),
});
