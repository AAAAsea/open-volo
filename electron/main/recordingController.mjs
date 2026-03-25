import crypto from 'node:crypto';

export function createRecordingController({
  bubble,
  send,
  sendStatus,
  sendInputHint,
  maxRecordingSeconds,
  maxTranscribingMs = 15000,
}) {
  let stage = 'idle';
  let recordingStartedAt = 0;
  let pendingSessionId = null;
  let pendingDurationMs = 0;
  let autoStopTimer = null;
  let transcribingTimer = null;
  let activeTranscriptionSessionId = null;
  let activeTranscriptionToken = 0;

  const getStage = () => stage;

  const clearTranscribingState = () => {
    clearTimeout(transcribingTimer);
    transcribingTimer = null;
    pendingSessionId = null;
    pendingDurationMs = 0;
    activeTranscriptionSessionId = null;
  };

  const isProcessingStage = () => stage === 'transcribing' || stage === 'refining';

  const abortTranscription = (source, { title = '已取消识别', hint = '本次识别已结束' } = {}) => {
    if (!isProcessingStage()) return false;

    activeTranscriptionToken += 1;
    clearTranscribingState();
    bubble.resetTranscribingProgress();
    stage = 'idle';
    sendStatus();
    sendInputHint(hint);
    bubble.showMessage({ title, hint }, 1400);
    console.log('[Volo] Transcription aborted:', source);
    return true;
  };

  const startRecording = (source) => {
    if (stage !== 'idle') return false;

    stage = 'arming';
    bubble.setProgress(0);
    bubble.hideResult();
    clearTranscribingState();
    recordingStartedAt = Date.now();
    sendStatus();
    bubble.setVisible(true);
    bubble.setStage('arming');

    clearTimeout(autoStopTimer);
    autoStopTimer = setTimeout(() => {
      if (stage !== 'recording') return;
      stopRecording('auto-timeout');
      sendInputHint(`录音已达到 ${maxRecordingSeconds} 秒上限，已自动结束`);
    }, maxRecordingSeconds * 1000);

    console.log('[Volo] Recording started:', source);
    return true;
  };

  const stopRecording = (source) => {
    if (stage !== 'recording') return false;

    stage = 'transcribing';
    sendStatus();
    bubble.setStage('transcribing');
    clearTimeout(autoStopTimer);
    bubble.startTranscribingProgress();

    const durationMs = Math.max(300, Date.now() - recordingStartedAt);
    pendingDurationMs = durationMs;
    pendingSessionId = crypto.randomUUID();
    activeTranscriptionSessionId = pendingSessionId;
    activeTranscriptionToken += 1;
    const transcriptionTokenAtStart = activeTranscriptionToken;
    clearTimeout(transcribingTimer);
    transcribingTimer = setTimeout(() => {
      if (!isProcessingStage() || activeTranscriptionToken !== transcriptionTokenAtStart) return;
      abortTranscription('transcribing-timeout', {
        title: '识别超时',
        hint: `识别等待超过 ${Math.round(maxTranscribingMs / 1000)} 秒，已自动结束`,
      });
    }, maxTranscribingMs);
    send('voice:audio-request', { sessionId: pendingSessionId });

    console.log('[Volo] Recording completed:', source);
    return true;
  };

  const cancelRecording = (source) => {
    if (isProcessingStage()) {
      return abortTranscription(source, {
        title: '已取消识别',
        hint: '已停止等待识别结果',
      });
    }

    if (stage !== 'recording' && stage !== 'arming') return false;

    clearTimeout(autoStopTimer);
    clearTranscribingState();
    stage = 'idle';
    sendStatus();
    bubble.hideWithFade();
    console.log('[Volo] Recording cancelled:', source);
    return true;
  };

  const setIdleAfterTranscription = (showedResultBubble) => {
    clearTranscribingState();
    stage = 'idle';
    sendStatus();
    if (!showedResultBubble) {
      bubble.hideWithFade();
    }
  };

  const setProcessingStage = (nextStage) => {
    if (!isProcessingStage()) return false;
    if (nextStage !== 'transcribing' && nextStage !== 'refining') return false;
    stage = nextStage;
    sendStatus();
    bubble.setStage(nextStage);
    return true;
  };

  const handleAudioLevel = (payload) => {
    if (stage === 'arming') {
      stage = 'recording';
      sendStatus();
      bubble.setStage('recording');
    }
    if (stage !== 'recording') return;
    const level = Math.max(0, Math.min(1, Number(payload?.level) || 0));
    bubble.setLevel(level);
  };

  const handleAudioSpectrum = (payload) => {
    if (stage === 'arming') {
      stage = 'recording';
      sendStatus();
      bubble.setStage('recording');
    }
    if (stage !== 'recording') return;
    bubble.setSpectrum(payload);
  };

  const handleCaptureReady = () => {
    if (stage !== 'arming') return;
    stage = 'recording';
    sendStatus();
    bubble.setStage('recording');
  };

  const handleCaptureFailed = () => {
    if (stage !== 'arming') return;
    stage = 'idle';
    sendStatus();
    bubble.showMessage({
      title: '麦克风未就绪',
      hint: '请检查麦克风权限后重试',
    });
  };

  const getPendingSession = () => ({
    sessionId: pendingSessionId,
    durationMs: pendingDurationMs,
    transcriptionToken: activeTranscriptionToken,
  });

  const clearPendingSession = () => {
    pendingSessionId = null;
    pendingDurationMs = 0;
  };

  const isTranscriptionActive = (sessionId, transcriptionToken) =>
    isProcessingStage() &&
    activeTranscriptionSessionId === sessionId &&
    activeTranscriptionToken === transcriptionToken;

  const destroy = () => {
    clearTimeout(autoStopTimer);
    clearTimeout(transcribingTimer);
    autoStopTimer = null;
    transcribingTimer = null;
  };

  return {
    getStage,
    startRecording,
    stopRecording,
    cancelRecording,
    setIdleAfterTranscription,
    handleAudioLevel,
    handleAudioSpectrum,
    handleCaptureReady,
    handleCaptureFailed,
    getPendingSession,
    clearPendingSession,
    isTranscriptionActive,
    setProcessingStage,
    destroy,
  };
}
