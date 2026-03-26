import fs from "node:fs";
import path from "node:path";

const rawVersion = String(process.argv[2] || "").trim().replace(/^v/, "");

if (!rawVersion) {
  console.error("Usage: node scripts/extract-release-notes.mjs <version>");
  process.exit(1);
}

const changelogPath = path.resolve(process.cwd(), "CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf8");
const lines = changelog.split(/\r?\n/);

const targetHeading = `## [${rawVersion}]`;
const startIndex = lines.findIndex((line) => line.startsWith(targetHeading));

if (startIndex === -1) {
  console.error(`Could not find ${targetHeading} in CHANGELOG.md`);
  process.exit(1);
}

let endIndex = lines.length;
for (let index = startIndex + 1; index < lines.length; index += 1) {
  if (/^## \[/.test(lines[index])) {
    endIndex = index;
    break;
  }
}

const body = lines
  .slice(startIndex + 1, endIndex)
  .join("\n")
  .trim();

if (!body) {
  console.error(`No release notes found for ${rawVersion} in CHANGELOG.md`);
  process.exit(1);
}

process.stdout.write(`${body}\n`);
