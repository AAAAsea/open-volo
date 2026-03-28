<p align="center">
  <img src="./assets/branding/volo.png" alt="Volo logo" width="180" />
</p>

<h1 align="center">Volo</h1>

<p align="center">
  Open-source desktop voice input app for macOS and Windows.
</p>

<p align="center">
  <a href="./README.zh-CN.md">中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-37-47848F?logo=electron&logoColor=white" alt="Electron 37" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-111827" alt="macOS and Windows" />
  <img src="https://img.shields.io/badge/License-MIT-16A34A" alt="MIT License" />
</p>

Volo is an Electron-based desktop voice input app. It lets users trigger a floating capsule with a shortcut, record speech, run cloud transcription plus optional cleanup, and insert the final text back into the current input context.

The repository is maintained with macOS experience as the first priority, while keeping Windows packaging and distribution fully supported.

## Highlights

- Hold-to-talk shortcut flow
- Floating bubble for recording, transcription, and refine status
- Cross-app paste with clipboard restore
- History, dictionary, and debug logs
- AI text cleanup with OpenAI-compatible providers

## Tech Stack

- Desktop framework: Electron
- Frontend: React 19 + Vite 6 + Tailwind CSS
- Speech recognition: Doubao / Volcengine ASR
- Text cleanup: OpenAI-compatible providers
- Packaging: electron-builder + GitHub Actions
- Auto update: electron-updater + GitHub Releases

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

## Local Development

1. Install dependencies

```bash
pnpm install
```

2. Copy the env template and fill in your own service credentials

```bash
cp .env.example .env
```

3. Start the development environment

```bash
pnpm run dev
```

Useful commands:

```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm run dist:mac
pnpm run dist:win
pnpm run generate:icons
```

Build artifacts are written to `release/` by default.

## Project Structure

- `electron/`: main process, permissions, recording control, cross-app paste, update manager
- `src/mainview/`: main React UI, floating bubble UI, settings, history
- `scripts/`: helper build scripts, icon generation, notarization, release note extraction
- `assets/`: branding and packaged app icons

## Helpers and Local Binaries

macOS-specific Swift helpers are kept in source form and are not committed as built binaries:

- `electron/resources/fn-monitor.swift`
- `electron/resources/input-helper.swift`

During local development they are built automatically when needed. `pnpm run build` also rebuilds the required binaries on macOS before packaging.

## Configuration

The repository provides [.env.example](./.env.example) as a starting point for:

- ASR credentials
- text cleanup provider config
- debug and runtime flags

Do not commit real keys, certificates, or account credentials.

## Versions and Releases

- Changes are tracked in [CHANGELOG.md](./CHANGELOG.md)
- Releases are built by [release.yml](./.github/workflows/release.yml)
- Pushing a tag like `v0.1.2` triggers CI, which verifies the tag matches `package.json`

GitHub Releases also act as the update source:

- macOS uses `zip + latest-mac.yml`
- Windows uses `NSIS + latest.yml`

Development builds do not check for updates. Use packaged artifacts when validating the full update flow.

### Maintainer Notes

To publish macOS builds in GitHub Actions, configure these repository secrets:

- `APPLE_CERTIFICATE_P12_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

For local signed macOS release work:

```bash
pnpm run dist:mac:signed
pnpm run notarize:mac
```

## Open Source Collaboration

- License: [MIT](./LICENSE)
- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Do not push directly to `main`** — all changes must go through Pull Requests
- If a change affects user-visible behavior, packaging, or release flow, update `CHANGELOG.md`

## Maintenance Rules

- Keep CI and local packaging paths aligned whenever possible
- Before releasing, make sure `CHANGELOG.md`, `package.json`, and the Git tag all match
