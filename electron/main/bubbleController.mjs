import { BrowserWindow, screen } from 'electron';

export function createBubbleController({
  isDev,
  rendererUrl,
  bubbleIndexPath,
  bubblePreloadPath,
  sizes,
  getStage,
}) {
  let bubbleWindow = null;
  let bubbleMode = 'compact';
  let bubbleHintTimer = null;
  let bubbleHideTimer = null;
  let transcribingProgressTimer = null;
  let transcribingProgress = 0;

  const executeScript = (script) => {
    if (!bubbleWindow?.webContents) return;
    if (bubbleWindow.webContents.isLoading()) {
      bubbleWindow.webContents.once('did-finish-load', () => {
        bubbleWindow?.webContents.executeJavaScript(script).catch(() => {});
      });
      return;
    }
    bubbleWindow.webContents.executeJavaScript(script).catch(() => {});
  };

  const positionWindow = () => {
    if (!bubbleWindow) return;
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { x, y, width, height } = display.workArea;
    const { width: bubbleWidth, height: bubbleHeight } =
      bubbleMode === 'result'
        ? sizes.result
        : bubbleMode === 'message'
          ? sizes.message
          : sizes.compact;
    const idealX = Math.round(x + width / 2 - bubbleWidth / 2);
    const idealY = Math.round(y + height - bubbleHeight - 28);
    const nextX = Math.max(x + 12, Math.min(idealX, x + width - bubbleWidth - 12));
    const nextY = Math.max(y + 12, Math.min(idealY, y + height - bubbleHeight - 12));
    bubbleWindow.setPosition(nextX, nextY);
  };

  const setMode = (nextMode) => {
    if (!bubbleWindow) return;
    bubbleMode = nextMode;
    const targetSize =
      nextMode === 'result'
        ? sizes.result
        : nextMode === 'message'
          ? sizes.message
          : sizes.compact;
    bubbleWindow.setSize(targetSize.width, targetSize.height);
    bubbleWindow.setFocusable(nextMode === 'result');
    positionWindow();
  };

  const setVisible = (visible, options = {}) => {
    if (!bubbleWindow) return;
    if (visible && bubbleHideTimer) {
      clearTimeout(bubbleHideTimer);
      bubbleHideTimer = null;
    }
    if (visible) {
      positionWindow();
      if (options.activate) {
        bubbleWindow.show();
        bubbleWindow.focus();
      } else {
        bubbleWindow.showInactive();
      }
    } else {
      bubbleWindow.hide();
    }
  };

  const hideWithFade = (delayMs = 170) => {
    if (!bubbleWindow) return;
    executeScript("window.__voloBubble?.setStage('idle');");
    if (bubbleHideTimer) clearTimeout(bubbleHideTimer);
    bubbleHideTimer = setTimeout(() => {
      bubbleHideTimer = null;
      if (getStage() !== 'idle') return;
      setVisible(false);
    }, delayMs);
  };

  const setStage = (nextStage) => {
    executeScript(`window.__voloBubble?.setStage(${JSON.stringify(nextStage)});`);
  };

  const setLevel = (level) => {
    executeScript(
      `window.__voloBubble?.setLevel(${Math.max(0, Math.min(1, level)).toFixed(3)});`,
    );
  };

  const setSpectrum = (spectrum = {}) => {
    const payload = {
      level: Math.max(0, Math.min(1, Number(spectrum.level) || 0)),
      low: Math.max(0, Math.min(1, Number(spectrum.low) || 0)),
      mid: Math.max(0, Math.min(1, Number(spectrum.mid) || 0)),
      high: Math.max(0, Math.min(1, Number(spectrum.high) || 0)),
    };
    executeScript(`window.__voloBubble?.setSpectrum(${JSON.stringify(payload)});`);
  };

  const setProgress = (progress) => {
    const normalized = Math.max(0, Math.min(1, Number(progress) || 0));
    executeScript(`window.__voloBubble?.setProgress(${normalized.toFixed(3)});`);
  };

  const startTranscribingProgress = () => {
    resetTranscribingProgress();
    transcribingProgressTimer = setInterval(() => {
      if (getStage() !== 'transcribing' && getStage() !== 'refining') return;
      const nextStep = transcribingProgress < 0.7 ? 0.05 : 0.02;
      transcribingProgress = Math.min(0.95, transcribingProgress + nextStep);
      setProgress(transcribingProgress);
    }, 120);
  };

  const resetTranscribingProgress = () => {
    clearInterval(transcribingProgressTimer);
    transcribingProgressTimer = null;
    transcribingProgress = 0;
    setProgress(0);
  };

  const finishTranscribingProgress = async () => {
    clearInterval(transcribingProgressTimer);
    transcribingProgressTimer = null;
    setProgress(1);
    await new Promise((resolve) => setTimeout(resolve, 140));
    transcribingProgress = 0;
  };

  const showMessage = ({ title, hint }, durationMs = 1800) => {
    clearTimeout(bubbleHintTimer);
    setMode('message');
    setVisible(true);
    setStage('message');
    executeScript(`window.__voloBubble?.setMessage(${JSON.stringify({ title, hint })});`);
    bubbleHintTimer = setTimeout(() => {
      if (getStage() !== 'idle') return;
      hideWithFade();
    }, durationMs);
  };

  const showResult = ({ text, hint, title = '自动粘贴失败', canContinuePaste = false }) => {
    clearTimeout(bubbleHintTimer);
    setMode('result');
    setVisible(true, { activate: true });
    executeScript(
      `window.__voloBubble?.showResult(${JSON.stringify({
        title,
        hint,
        text,
        canContinuePaste,
      })});`,
    );
  };

  const hideResult = () => {
    if (!bubbleWindow) return;
    executeScript('window.__voloBubble?.hideResult();');
    setMode('compact');
  };

  const createWindow = () => {
    bubbleWindow = new BrowserWindow({
      width: sizes.compact.width,
      height: sizes.compact.height,
      frame: false,
      transparent: true,
      show: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      webPreferences: {
        devTools: false,
        preload: bubblePreloadPath,
        contextIsolation: true,
        sandbox: false,
      },
    });

    bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    setMode('compact');
    positionWindow();
    if (isDev) {
      bubbleWindow.loadURL(`${rendererUrl}/bubble.html`);
    } else {
      bubbleWindow.loadFile(bubbleIndexPath);
    }
    return bubbleWindow;
  };

  const destroy = () => {
    clearInterval(transcribingProgressTimer);
    clearTimeout(bubbleHintTimer);
    clearTimeout(bubbleHideTimer);
    transcribingProgressTimer = null;
    bubbleHintTimer = null;
    bubbleHideTimer = null;
  };

  return {
    createWindow,
    positionWindow,
    setMode,
    setVisible,
    hideWithFade,
    setStage,
    setLevel,
    setSpectrum,
    setProgress,
    startTranscribingProgress,
    resetTranscribingProgress,
    finishTranscribingProgress,
    showMessage,
    showResult,
    hideResult,
    destroy,
  };
}
