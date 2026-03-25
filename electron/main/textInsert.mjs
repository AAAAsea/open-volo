const CLIPBOARD_SETTLE_MS = 40;
const PASTE_RESTORE_DELAY_MS = 900;

export function createTextInserter({ clipboard, execFileAsync, env, nativeMacInput }) {
  const platform = process.platform;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const snapshotClipboard = () => {
    const formats = clipboard.availableFormats();
    return formats.map((format) => ({
      format,
      buffer: clipboard.readBuffer(format),
    }));
  };

  const restoreClipboard = (snapshot) => {
    clipboard.clear();
    for (const item of snapshot) {
      clipboard.writeBuffer(item.format, item.buffer);
    }
  };

  const waitForClipboardText = async (expectedText, attempts = 6) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (clipboard.readText() === expectedText) {
        return true;
      }
      await sleep(CLIPBOARD_SETTLE_MS);
    }
    return false;
  };

  const triggerPasteShortcut = async (options = {}) => {
    if (platform === 'darwin') {
      if (!nativeMacInput) {
        throw new Error('missing-native-mac-input-helper');
      }
      if (!options?.targetApp?.bundleId) {
        throw new Error('missing-target-app-for-helper-paste');
      }
      await nativeMacInput.activateAndPaste(options.targetApp.bundleId);
      return;
    }

    if (platform === 'win32') {
      await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          '$wshell = New-Object -ComObject WScript.Shell; Start-Sleep -Milliseconds 60; $wshell.SendKeys("^v")',
        ],
        { timeout: 3000, env },
      );
      return;
    }

    throw new Error(`unsupported-paste-platform:${platform}`);
  };

  const pasteViaClipboard = async (text, options = {}) => {
    const clipboardSnapshot = snapshotClipboard();
    try {
      clipboard.writeText(text);
      const clipboardReady = await waitForClipboardText(text);
      if (!clipboardReady) {
        throw new Error('clipboard-set-mismatch');
      }

      await triggerPasteShortcut(options);
      await sleep(PASTE_RESTORE_DELAY_MS);

      // Only restore if clipboard still equals what we set.
      // This avoids clobbering user clipboard changes made after the paste.
      if (clipboard.readText() === text) {
        restoreClipboard(clipboardSnapshot);
      }
      return true;
    } finally {
      if (clipboard.readText() === text) {
        restoreClipboard(clipboardSnapshot);
      }
    }
  };

  return async function insertText(text, options = {}) {
    try {
      console.warn('[Volo] Clipboard paste text preview:', text.slice(0, 200));
      return await pasteViaClipboard(text, options);
    } catch (error) {
      const err = error;
      const message = err instanceof Error ? err.message : String(err);
      const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr || '') : '';
      const stdout = err && typeof err === 'object' && 'stdout' in err ? String(err.stdout || '') : '';
      console.warn('[Volo] Clipboard paste failed:', { message, stderr, stdout });
      return false;
    }
  };
}
