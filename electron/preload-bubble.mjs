import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('voloBubble', {
  resultCopied: () => ipcRenderer.invoke('voice:bubble-result-copied'),
  resultContinuePaste: () => ipcRenderer.invoke('voice:bubble-result-continue-paste'),
  resultClosed: () => ipcRenderer.invoke('voice:bubble-result-closed'),
});
