function getMicrophoneStatus(systemPreferences, platform = process.platform) {
  if (platform !== 'darwin') return 'granted';
  if (typeof systemPreferences?.getMediaAccessStatus !== 'function') return 'unknown';
  return systemPreferences.getMediaAccessStatus('microphone') || 'unknown';
}

function getAccessibilityStatus(systemPreferences, platform = process.platform) {
  if (platform !== 'darwin') return 'granted';
  if (typeof systemPreferences?.isTrustedAccessibilityClient !== 'function') return 'unknown';
  return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'denied';
}

export function getPermissionStatuses(systemPreferences, platform = process.platform) {
  const microphone = getMicrophoneStatus(systemPreferences, platform);
  const accessibility = getAccessibilityStatus(systemPreferences, platform);
  return { microphone, accessibility };
}

export function broadcastPermissions(send, systemPreferences) {
  send('voice:permissions', getPermissionStatuses(systemPreferences));
}

export async function requestPermission(systemPreferences, kind) {
  if (process.platform !== 'darwin') {
    return { ok: true, status: 'granted' };
  }
  if (kind === 'microphone') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    const status = granted ? 'granted' : systemPreferences.getMediaAccessStatus('microphone');
    return { ok: true, status };
  }
  if (kind === 'accessibility') {
    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    const status = trusted ? 'granted' : 'denied';
    return { ok: true, status };
  }
  return { ok: false, status: 'unsupported' };
}

export function openPermissions(shell, kind) {
  if (process.platform !== 'darwin') return;
  if (kind === 'microphone') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
  } else {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  }
}
