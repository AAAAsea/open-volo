import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function createFnShortcutMonitor({
  app,
  execFileAsync,
  onPress,
  onRelease,
  onError,
  helperPaths,
}) {
  const resolvedHelperPaths = helperPaths ?? {
    binaryPath: app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'resources', 'fn-monitor')
      : path.join(process.cwd(), 'electron', 'resources', 'fn-monitor'),
    sourcePath: app.isPackaged
      ? null
      : path.join(process.cwd(), 'electron', 'resources', 'fn-monitor.swift'),
  };
  let child = null;
  let desired = false;
  let destroyed = false;
  let lastPressed = false;
  let restartTimer = null;
  let compilePromise = null;
  let startingPromise = null;

  const clearRestartTimer = () => {
    if (!restartTimer) return;
    clearTimeout(restartTimer);
    restartTimer = null;
  };

  const reportError = (message) => {
    const text = String(message || '').trim();
    if (!text) return;
    onError?.(text);
  };

  const ensureHelperBinary = async () => {
    const binaryExists = await fileExists(resolvedHelperPaths.binaryPath);
    const shouldRebuildInDev = !app.isPackaged && binaryExists && resolvedHelperPaths.sourcePath;

    if (binaryExists && !shouldRebuildInDev) {
      return resolvedHelperPaths.binaryPath;
    }

    if (shouldRebuildInDev) {
      try {
        const [binaryStat, sourceStat] = await Promise.all([
          fs.stat(resolvedHelperPaths.binaryPath),
          fs.stat(resolvedHelperPaths.sourcePath),
        ]);
        if (binaryStat.mtimeMs >= sourceStat.mtimeMs) {
          return resolvedHelperPaths.binaryPath;
        }
      } catch {
        // Fall through to rebuild when stat fails.
      }
    }

    if (app.isPackaged) {
      throw new Error('Fn 监听器缺失，请重新打包桌面应用。');
    }

    if (!resolvedHelperPaths.sourcePath || !(await fileExists(resolvedHelperPaths.sourcePath))) {
      throw new Error('Fn 监听源码不存在，无法启动监听器。');
    }

    if (!compilePromise) {
      compilePromise = execFileAsync(
        'xcrun',
        ['swiftc', resolvedHelperPaths.sourcePath, '-O', '-o', resolvedHelperPaths.binaryPath],
        {
          env: process.env,
        },
      )
        .catch((error) => {
          const stderr =
            error && typeof error === 'object' && 'stderr' in error ? String(error.stderr || '') : '';
          const stdout =
            error && typeof error === 'object' && 'stdout' in error ? String(error.stdout || '') : '';
          const detail = stderr || stdout || (error instanceof Error ? error.message : String(error));
          throw new Error(`Fn 监听器编译失败：${detail}`);
        })
        .finally(() => {
          compilePromise = null;
        });
    }

    await compilePromise;
    return resolvedHelperPaths.binaryPath;
  };

  const scheduleRestart = () => {
    clearRestartTimer();
    if (!desired || destroyed) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      void start().catch((error) => {
        reportError(error instanceof Error ? error.message : String(error));
      });
    }, 1200);
  };

  const stopChild = () => {
    clearRestartTimer();
    const current = child;
    child = null;
    lastPressed = false;
    if (!current) return;
    current.kill();
  };

  const handleMessage = (message, ready) => {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'error') {
      const error = new Error(String(message.message || 'Fn 监听器启动失败。'));
      if (ready.reject) {
        ready.reject(error);
        ready.resolve = null;
        ready.reject = null;
        return;
      }
      reportError(error.message);
      return;
    }

    if (message.type === 'ready') {
      ready.resolve?.();
      ready.resolve = null;
      ready.reject = null;
      return;
    }

    if (message.type === 'fn') {
      if (message.phase === 'down') {
        if (lastPressed) return;
        lastPressed = true;
        onPress?.();
        return;
      }

      if (message.phase === 'up') {
        if (!lastPressed) return;
        lastPressed = false;
        onRelease?.();
      }
    }
  };

  const start = async () => {
    if (destroyed) {
      throw new Error('Fn 监听器已销毁。');
    }

    desired = true;
    clearRestartTimer();
    if (startingPromise) return startingPromise;
    if (child) return;

    startingPromise = (async () => {
      const binaryPath = await ensureHelperBinary();
      const nextChild = spawn(binaryPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child = nextChild;
      const ready = { resolve: null, reject: null };
      const readyPromise = new Promise((resolve, reject) => {
        ready.resolve = resolve;
        ready.reject = reject;
      });
      const readyTimeout = setTimeout(() => {
        ready.reject?.(new Error('Fn 监听器启动超时。'));
        ready.resolve = null;
        ready.reject = null;
      }, 4000);

      const closeReady = () => {
        clearTimeout(readyTimeout);
      };

      const stdout = readline.createInterface({ input: nextChild.stdout });
      const stderr = readline.createInterface({ input: nextChild.stderr });

      stdout.on('line', (line) => {
        try {
          handleMessage(JSON.parse(line), ready);
        } catch {
          // Ignore malformed lines from the helper and continue.
        }
      });

      stderr.on('line', (line) => {
        const message = String(line || '').trim();
        if (message) {
          reportError(`Fn 监听器日志：${message}`);
        }
      });

      nextChild.once('error', (error) => {
        closeReady();
        if (child === nextChild) {
          child = null;
        }
        ready.reject?.(error);
        ready.resolve = null;
        ready.reject = null;
      });

      nextChild.once('exit', (code, signal) => {
        closeReady();
        if (child === nextChild) {
          child = null;
        }
        if (ready.reject) {
          ready.reject(new Error(`Fn 监听器已退出（code=${code ?? 'null'} signal=${signal ?? 'null'}）。`));
          ready.resolve = null;
          ready.reject = null;
          return;
        }
        if (!desired || destroyed) return;
        scheduleRestart();
      });

      try {
        await readyPromise;
      } catch (error) {
        stopChild();
        throw error;
      } finally {
        closeReady();
      }
    })().finally(() => {
      startingPromise = null;
    });

    return startingPromise;
  };

  const stop = () => {
    desired = false;
    stopChild();
  };

  const destroy = () => {
    destroyed = true;
    stop();
  };

  return {
    start,
    stop,
    destroy,
  };
}
