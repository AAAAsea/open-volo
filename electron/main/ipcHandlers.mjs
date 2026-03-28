export function registerIpcHandlers({
  ipcMain,
  systemPreferences,
  shell,
  sanitizeShortcut,
  registerGlobalShortcut,
  sendShortcutApplied,
  setShortcutPreviewMode,
  setShortcutCaptureActive,
  handleGlobalShortcut,
  beginRecording,
  stopRecording,
  cancelRecording,
  recording,
  runtimeConfigStore,
  bubble,
  send,
  getDebugState,
  clearDebugLogs,
  syncDebugEnabled,
  sendInputHint,
  ensureReadyForRecording,
  getMainWindow,
  broadcastPermissions,
  getPermissionStatuses,
  getTargetAppSnapshot,
  clearTargetAppSnapshot,
  getFrontmostAppSnapshot,
  insertTextViaAX,
  transcribeAudio,
  refineTranscriptText,
  updateManager,
  reRegisterTranslateShortcut,
  sendTranslateShortcutApplied,
  handleGlobalTranslateShortcut,
}) {
  const TRANSCRIPTION_TIMEOUT_MS = 10000;
  const REFINE_NON_FATAL_REASONS = new Set([
    'disabled',
    'missing-api-key',
    'invalid-api-key',
    'missing-base-url',
    'missing-model',
    'missing-prompt',
  ]);
  const sameAppSnapshot = (left, right) => {
    if (!left || !right) return false;
    if (left.bundleId && right.bundleId) {
      return left.bundleId === right.bundleId;
    }
    if (left.pid && right.pid) {
      return Number(left.pid) === Number(right.pid);
    }
    return false;
  };

  const joinHints = (...parts) => parts.filter(Boolean).join('；');
  let pendingResultAction = null;

  const clearPendingResultAction = () => {
    pendingResultAction = null;
  };

  const showResultBubble = ({ text, hint, title = '自动粘贴失败', canContinuePaste = false }, pendingAction = null) => {
    pendingResultAction = pendingAction;
    bubble.showResult({ text, hint, title, canContinuePaste });
  };

  const withTimeout = (promise, ms, message) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, ms);

      Promise.resolve(promise).then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });

  ipcMain.handle('voice:set-shortcut', async (_event, payload) => {
    const normalized = sanitizeShortcut(payload);
    if (!normalized) {
      const result = { ok: false, error: '快捷键格式无效' };
      sendShortcutApplied(false, result.error);
      return result;
    }

    const result = await registerGlobalShortcut(normalized);
    sendShortcutApplied(result.ok, result.error);
    return result;
  });

  ipcMain.handle('voice:set-translate-shortcut', async (_event, payload) => {
    try {
      const accelerator = String(payload?.accelerator ?? '').trim();
      const display = String(payload?.display ?? '').trim();
      if (!accelerator || !display) {
        sendTranslateShortcutApplied(false, '快捷键格式无效');
        return { ok: false, error: '快捷键格式无效' };
      }
      const config = await runtimeConfigStore.updateConfig({
        translateShortcutAccelerator: accelerator,
        translateShortcutDisplay: display,
      });
      reRegisterTranslateShortcut();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('voice:begin-shortcut-capture', () => {
    setShortcutCaptureActive(true);
    return { ok: true };
  });

  ipcMain.handle('voice:set-shortcut-preview-mode', (_event, payload) => {
    setShortcutPreviewMode(Boolean(payload?.enabled));
    return { ok: true };
  });

  ipcMain.handle('voice:end-shortcut-capture', () => {
    setShortcutCaptureActive(false);
    return { ok: true };
  });

  ipcMain.handle('voice:start-shortcut-hold', (_event, { source }) => {
    if (!ensureReadyForRecording()) {
      return { ok: false, error: '识别服务未配置' };
    }
    beginRecording(source ?? 'window-hotkey');
    return { ok: true };
  });

  ipcMain.handle('voice:end-shortcut-hold', (_event, { source }) => {
    if (recording.getStage() === 'arming') {
      cancelRecording(source ?? 'window-hotkey');
    } else {
      stopRecording(source ?? 'window-hotkey');
    }
    return { ok: true };
  });

  ipcMain.handle('voice:end-translate-hold', (_event, { source }) => {
    if (recording.getStage() === 'arming') {
      cancelRecording(source ?? 'window-hotkey');
    } else {
      stopRecording(source ?? 'window-hotkey');
    }
    return { ok: true };
  });

  ipcMain.handle('voice:cancel-recording', (_event, { source }) => {
    cancelRecording(source ?? 'escape');
    return { ok: true };
  });

  ipcMain.handle('voice:get-runtime-config', () => {
    return { ok: true, config: runtimeConfigStore.getConfig() };
  });

  ipcMain.handle('voice:get-debug-state', () => {
    return { ok: true, ...getDebugState() };
  });

  ipcMain.handle('voice:get-update-state', () => {
    return { ok: true, state: updateManager.getState() };
  });

  ipcMain.handle('voice:check-for-updates', async () => {
    return updateManager.checkForUpdates({ manual: true });
  });

  ipcMain.handle('voice:download-update', async () => {
    return updateManager.downloadUpdate();
  });

  ipcMain.handle('voice:install-update', async () => {
    return updateManager.installUpdate();
  });

  ipcMain.handle('voice:clear-debug-logs', () => {
    clearDebugLogs();
    return { ok: true };
  });

  ipcMain.handle('voice:set-runtime-config', async (_event, payload) => {
    try {
      const config = await runtimeConfigStore.updateConfig(payload ?? {});
      syncDebugEnabled(config.debugEnabled);
      return { ok: true, config };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        config: runtimeConfigStore.getConfig(),
      };
    }
  });

  ipcMain.handle('voice:trigger-shortcut', () => {
    void handleGlobalShortcut();
    return { ok: true };
  });

  ipcMain.handle('voice:bubble-result-copied', () => {
    return { ok: true };
  });

  ipcMain.handle('voice:bubble-result-continue-paste', async () => {
    if (!pendingResultAction || pendingResultAction.type !== 'continue-paste') {
      return { ok: false, error: '当前没有可继续粘贴的目标' };
    }

    const accessibility =
      typeof systemPreferences.isTrustedAccessibilityClient === 'function' &&
      systemPreferences.isTrustedAccessibilityClient(false)
        ? 'granted'
        : 'denied';
    if (accessibility !== 'granted') {
      return { ok: false, error: '需要辅助功能权限才能继续粘贴' };
    }

    const pasted = await insertTextViaAX(pendingResultAction.text, {
      targetApp: pendingResultAction.targetAppSnapshot,
    });
    if (!pasted) {
      return { ok: false, error: '继续粘贴失败，请改用复制' };
    }

    recording.setIdleAfterTranscription(false);
    clearPendingResultAction();
    clearTargetAppSnapshot();
    return { ok: true };
  });

  ipcMain.handle('voice:bubble-result-closed', () => {
    recording.setIdleAfterTranscription(false);
    clearPendingResultAction();
    clearTargetAppSnapshot();
    return { ok: true };
  });

  ipcMain.handle('voice:get-permissions', () => {
    return { ok: true, permissions: getPermissionStatuses(systemPreferences) };
  });

  ipcMain.handle('voice:request-permission', async (_event, payload) => {
    const kind = payload?.kind;
    if (process.platform !== 'darwin') {
      broadcastPermissions(send, systemPreferences);
      return { ok: true, status: 'granted' };
    }
    if (kind === 'microphone') {
      console.log('[Volo] Requesting microphone permission');
      const granted = await systemPreferences.askForMediaAccess('microphone');
      const status = granted ? 'granted' : systemPreferences.getMediaAccessStatus('microphone');
      console.log('[Volo] Microphone permission result:', { granted, status });
      broadcastPermissions(send, systemPreferences);
      return { ok: true, status };
    }
    if (kind === 'accessibility') {
      const trusted = systemPreferences.isTrustedAccessibilityClient(true);
      const status = trusted ? 'granted' : 'denied';
      broadcastPermissions(send, systemPreferences);
      return { ok: true, status };
    }
    return { ok: false, status: 'unsupported' };
  });

  ipcMain.handle('voice:open-permissions', (_event, payload) => {
    const kind = payload?.kind || 'accessibility';
    if (process.platform !== 'darwin') {
      return { ok: true };
    }
    if (kind === 'microphone') {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    } else {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    }
    return { ok: true };
  });

  ipcMain.on('voice:report-audio-level', (_event, payload) => {
    recording.handleAudioLevel(payload);
  });

  ipcMain.on('voice:report-audio-spectrum', (_event, payload) => {
    recording.handleAudioSpectrum(payload);
  });

  ipcMain.on('voice:capture-ready', () => {
    console.log('[Volo] Capture ready');
    recording.handleCaptureReady();
  });

  ipcMain.on('voice:capture-failed', () => {
    const micStatus =
      typeof systemPreferences.getMediaAccessStatus === 'function'
        ? systemPreferences.getMediaAccessStatus('microphone')
        : 'unknown';
    console.warn('[Volo] Capture failed; microphone status:', micStatus);
    recording.handleCaptureFailed();
  });

  ipcMain.on('voice:debug-log', (_event, payload) => {
    const level = payload?.level || 'info';
    const message = payload?.message || '';
    let detail = '';
    if (payload?.detail !== undefined) {
      if (typeof payload.detail === 'string') {
        detail = ` ${payload.detail}`;
      } else {
        try {
          detail = ` ${JSON.stringify(payload.detail)}`;
        } catch {
          detail = ` ${String(payload.detail)}`;
        }
      }
    }
    if (level === 'error') {
      console.error('[Volo][Renderer]', message + detail);
    } else if (level === 'warn') {
      console.warn('[Volo][Renderer]', message + detail);
    } else {
      console.info('[Volo][Renderer]', message + detail);
    }
  });

  ipcMain.handle('voice:submit-audio', async (_event, payload) => {
    const sessionId = String(payload?.sessionId ?? '');
    const pending = recording.getPendingSession();
    if (!sessionId || sessionId !== pending.sessionId) {
      return { ok: false, error: '录音会话已失效' };
    }
    const transcriptionToken = pending.transcriptionToken;

    recording.clearPendingSession();
    const durationMs = Math.max(0, Number(payload?.durationMs ?? pending.durationMs ?? 0));
    const rawData = payload?.data ? Buffer.from(new Uint8Array(payload.data)) : null;
    if (!rawData || rawData.byteLength === 0) {
      return { ok: false, error: '音频数据为空' };
    }

    const audioPath = `memory://volo-record-${Date.now()}.wav`;
    if (!recording.isTranscriptionActive(sessionId, transcriptionToken)) {
      clearPendingResultAction();
      clearTargetAppSnapshot();
      return { ok: false, error: '录音已取消', audioPath };
    }

    let text = '';
    let asrText = '';
    let refinedText = '';
    let rawErrorMessage = '';
    let shouldWarnRefineFallback = false;
    let fallbackHint = '';
    try {
      const result = await withTimeout(
        (async () => {
          const transcription = await transcribeAudio(rawData);
          asrText = transcription.text;
          recording.setProcessingStage('refining');
          const activeMode = recording.getActiveMode();
          const refined = await refineTranscriptText(asrText, { mode: activeMode });
          refinedText = refined.text;
          shouldWarnRefineFallback =
            Boolean(asrText) &&
            refined.text === asrText &&
            !refined.applied &&
            !REFINE_NON_FATAL_REASONS.has(refined.reason);
          if (shouldWarnRefineFallback) {
            fallbackHint = 'AI 润色失败，已回退原转写';
          }
          console.log('[Volo] Text refine status:', refined.reason);
          return refined;
        })(),
        TRANSCRIPTION_TIMEOUT_MS,
        `识别超时（>${Math.round(TRANSCRIPTION_TIMEOUT_MS / 1000)} 秒），请重试`,
      );
      text = result.text;
    } catch (error) {
      rawErrorMessage = error instanceof Error ? error.message : String(error);
      asrText = '';
      refinedText = '';
    }

    if (!recording.isTranscriptionActive(sessionId, transcriptionToken)) {
      clearPendingResultAction();
      clearTargetAppSnapshot();
      return { ok: false, error: '录音已取消', audioPath };
    }

    const shouldExternalPaste = !getMainWindow()?.isFocused();
    let showedResultBubble = false;
    const targetAppSnapshot = getTargetAppSnapshot?.() ?? null;
    if (fallbackHint) {
      sendInputHint(fallbackHint);
    }
    if (!rawErrorMessage && shouldExternalPaste) {
      if (process.platform !== 'darwin') {
        const pasted = await insertTextViaAX(text);
        if (!pasted) {
          sendInputHint('自动粘贴失败，请复制结果后手动粘贴');
          showResultBubble({
            text,
            title: '识别完成',
            hint: joinHints(fallbackHint, '自动粘贴失败，可复制后手动粘贴'),
          });
          showedResultBubble = true;
        }
      } else {
        let currentFrontmostApp = null;
        try {
          currentFrontmostApp = await getFrontmostAppSnapshot();
        } catch (error) {
          console.warn(
            '[Volo] Failed to read current frontmost app:',
            error instanceof Error ? error.message : String(error),
          );
        }
        const targetAppSwitched =
          Boolean(targetAppSnapshot) &&
          Boolean(currentFrontmostApp) &&
          !sameAppSnapshot(targetAppSnapshot, currentFrontmostApp);
        const pasteTargetApp = targetAppSnapshot || currentFrontmostApp;
        if (targetAppSwitched) {
          sendInputHint('检测到焦点应用已切换，未自动粘贴');
          showResultBubble({
            text,
            title: '识别完成',
            hint: joinHints(fallbackHint, '检测到你切换了应用，未自动粘贴，可复制后手动粘贴'),
            canContinuePaste: true,
          }, {
            type: 'continue-paste',
            text,
            targetAppSnapshot,
          });
          showedResultBubble = true;
        } else {
          const accessibility =
            typeof systemPreferences.isTrustedAccessibilityClient === 'function' &&
            systemPreferences.isTrustedAccessibilityClient(false)
              ? 'granted'
              : 'denied';
          if (accessibility !== 'granted') {
            sendInputHint('需要辅助功能权限才能自动粘贴');
            showResultBubble({
              text,
              hint: joinHints(fallbackHint, '需要辅助功能权限才能自动粘贴，可复制后手动粘贴'),
            });
            showedResultBubble = true;
          } else if (!pasteTargetApp?.bundleId) {
            sendInputHint('未识别到目标应用，无法自动粘贴');
            showResultBubble({
              text,
              hint: joinHints(fallbackHint, '未识别到目标应用，可复制后手动粘贴'),
            });
            showedResultBubble = true;
          } else {
            const pasted = await insertTextViaAX(text, { targetApp: pasteTargetApp });
            if (!pasted) {
              sendInputHint('自动粘贴失败，请复制结果后手动粘贴');
              showResultBubble({
                text,
                hint: joinHints(fallbackHint, '自动粘贴失败，可复制后手动粘贴'),
              });
              showedResultBubble = true;
            }
          }
        }
      }
    }

    if (rawErrorMessage) {
      console.error('[Volo] Transcription failed:', {
        sessionId,
        error: rawErrorMessage,
      });
      const userMessage = '识别失败，请重试';
      sendInputHint(userMessage);
      await bubble.finishTranscribingProgress();
      if (!recording.isTranscriptionActive(sessionId, transcriptionToken)) {
        clearPendingResultAction();
        clearTargetAppSnapshot();
        return { ok: false, error: '录音已取消', audioPath };
      }
      bubble.showMessage(
        {
          title: '识别失败',
          hint: userMessage,
        },
        2200,
      );
      recording.setIdleAfterTranscription(true);
      clearPendingResultAction();
      clearTargetAppSnapshot();
      return { ok: false, error: rawErrorMessage, audioPath };
    }

    send('voice:transcription', {
      text,
      originalText: asrText || text,
      refinedText: refinedText || text,
      audioPath,
      durationMs,
    });

    await bubble.finishTranscribingProgress();
    if (!recording.isTranscriptionActive(sessionId, transcriptionToken)) {
      clearPendingResultAction();
      clearTargetAppSnapshot();
      return { ok: false, error: '录音已取消', audioPath };
    }
    const shouldKeepBubbleVisible = showedResultBubble || Boolean(fallbackHint);
    recording.setIdleAfterTranscription(shouldKeepBubbleVisible);
    if (fallbackHint && !showedResultBubble) {
      bubble.showMessage(
        {
          title: '已使用原转写',
          hint: fallbackHint,
        },
        1600,
      );
    }
    if (!showedResultBubble) {
      clearPendingResultAction();
      clearTargetAppSnapshot();
    }
    return { ok: true, audioPath };
  });
}
