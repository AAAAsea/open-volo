import fs from 'node:fs/promises';
import path from 'node:path';

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function createMacInputHelper({
  app,
  execFileAsync,
  helperPaths,
}) {
  const resolvedHelperPaths = helperPaths ?? {
    binaryPath: app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'resources', 'input-helper')
      : path.join(process.cwd(), 'electron', 'resources', 'input-helper'),
    sourcePath: app.isPackaged
      ? null
      : path.join(process.cwd(), 'electron', 'resources', 'input-helper.swift'),
  };
  let compilePromise = null;

  const ensureHelperBinary = async () => {
    if (process.platform !== 'darwin') {
      throw new Error('macOS input helper is only available on macOS.');
    }

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
      throw new Error('缺少 macOS 输入助手，请重新打包桌面应用。');
    }

    if (!resolvedHelperPaths.sourcePath || !(await fileExists(resolvedHelperPaths.sourcePath))) {
      throw new Error('macOS 输入助手源码不存在，无法启动。');
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
          throw new Error(`macOS 输入助手编译失败：${detail}`);
        })
        .finally(() => {
          compilePromise = null;
        });
    }

    await compilePromise;
    await fs.chmod(resolvedHelperPaths.binaryPath, 0o755).catch(() => {});
    return resolvedHelperPaths.binaryPath;
  };

  const runHelper = async (args, { timeout = 2000 } = {}) => {
    const binaryPath = await ensureHelperBinary();
    const { stdout } = await execFileAsync(binaryPath, args, {
      env: process.env,
      timeout,
    });
    const raw = String(stdout || '').trim();
    if (!raw) {
      throw new Error('macOS 输入助手未返回结果。');
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`macOS 输入助手返回了无法解析的数据：${raw}`);
    }

    if (!payload?.ok) {
      throw new Error(String(payload?.error || 'macOS 输入助手执行失败。'));
    }
    return payload;
  };

  return {
    ensureReady: ensureHelperBinary,
    async getFrontmostApp() {
      if (process.platform !== 'darwin') return null;
      const payload = await runHelper(['frontmost']);
      return payload.app ?? null;
    },
    async activateAndPaste(bundleId) {
      if (process.platform !== 'darwin') return { ok: false };
      return runHelper(['activate-and-paste', bundleId], { timeout: 2500 });
    },
  };
}
