import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cwd = process.cwd();
const releaseDir = path.join(cwd, 'release');
const packageJsonPath = path.join(cwd, 'package.json');
const defaultProfile = process.env.NOTARY_PROFILE || 'AC_NOTARY';

async function readPackageVersion() {
  const content = await fs.readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(content);
  return String(pkg.version || '').trim();
}

async function findDmgPath() {
  const explicitPath = process.argv[2];
  if (explicitPath) {
    return path.resolve(cwd, explicitPath);
  }

  const version = await readPackageVersion();
  const entries = await fs.readdir(releaseDir, { withFileTypes: true });
  const dmgFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.dmg'))
    .map((entry) => entry.name)
    .filter((name) => !version || name.includes(version));

  if (dmgFiles.length === 0) {
    throw new Error(`No DMG found in ${releaseDir}`);
  }

  const prioritized = [...dmgFiles].sort((left, right) => {
    const leftScore = Number(left.includes('arm64')) + Number(left.includes(version));
    const rightScore = Number(right.includes('arm64')) + Number(right.includes(version));
    return rightScore - leftScore || left.localeCompare(right);
  });

  return path.join(releaseDir, prioritized[0]);
}

async function runXcrun(args) {
  const { stdout, stderr } = await execFileAsync('xcrun', args, { cwd });
  if (stdout.trim()) {
    console.log(stdout.trim());
  }
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}

async function main() {
  const dmgPath = await findDmgPath();
  console.log(`[notarize] using DMG: ${dmgPath}`);
  console.log(`[notarize] using profile: ${defaultProfile}`);

  await runXcrun(['notarytool', 'submit', dmgPath, '--keychain-profile', defaultProfile, '--wait']);
  await runXcrun(['stapler', 'staple', dmgPath]);
  await runXcrun(['stapler', 'validate', dmgPath]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
