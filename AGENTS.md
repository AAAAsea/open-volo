# AGENTS.md

This file is the working guide for AI agents and human contributors in `open-volo`.

Use it as the first stop before editing code, changing release behavior, or touching product-critical flows.

## Project Identity

- Repository: `AAAAsea/open-volo`
- Product name: `Volo`
- Type: Electron desktop voice input app
- Primary targets: macOS first, Windows supported in build and release flow
- License: MIT

This repository is now the only active mainline. The old private `saylo` repo is not the source of truth anymore.

## Product Intent

Volo lets the user hold a shortcut, speak, get cloud transcription plus optional light AI cleanup, and insert the final text into the current input context.

The app is optimized for:

- low-friction voice input
- strong macOS experience
- reliable cross-app paste behavior
- simple provider-based configuration
- GitHub Releases based auto-update flow

## High-Level Architecture

- `electron/`
  Main process, permissions, recording orchestration, ASR, paste helpers, update manager, runtime config.
- `src/mainview/`
  Main React UI for settings, history, dictionary, about page, and app shell.
- `src/mainview/bubble.tsx`
  Floating bubble UI for recording / transcribing / result actions.
- `src/shared/`
  Shared types for cross-process communication.
- `scripts/`
  Helper build scripts, notarization, icon generation, release note extraction.
- `assets/`
  Branding and packaged app icons.

## Critical Runtime Flows

### 1. Recording flow

- Shortcut triggers recording start in the Electron main process.
- Renderer captures audio and sends it back to main.
- Main process submits audio to ASR.
- Optional text refinement runs after ASR.
- Final text is inserted into the active context or shown in a fallback result bubble.

Important files:

- `electron/main.mjs`
- `electron/main/recordingController.mjs`
- `electron/main/ipcHandlers.mjs`
- `electron/main/asrClient.mjs`
- `electron/main/textRefiner.mjs`

### 2. Text insertion flow

- macOS uses the Swift helper paste path.
- Clipboard is written, paste is triggered, then clipboard is restored.
- If the target app changed during capture, the result bubble offers continue/copy/close instead of blind auto-paste.

Important files:

- `electron/main/textInsert.mjs`
- `electron/main/macInputHelper.mjs`
- `electron/resources/input-helper.swift`
- `electron/main/ipcHandlers.mjs`

### 3. Auto update flow

- Source of truth is GitHub Releases.
- `electron-updater` is used in packaged builds only.
- Release workflow builds macOS + Windows artifacts and publishes them to GitHub Releases.
- Release notes now come from `CHANGELOG.md`, not from GitHub auto-generated compare text.

Important files:

- `electron/main/updateManager.mjs`
- `.github/workflows/release.yml`
- `scripts/extract-release-notes.mjs`
- `CHANGELOG.md`

## Current Product Constraints

- macOS behavior quality matters more than Linux support.
- Linux auto-update is not supported.
- Doubao ASR is the only built-in ASR provider officially wired end-to-end right now.
- Additional ASR provider presets may exist in UI structure, but they are not necessarily production-complete.
- AI text refine is provider-based and OpenAI-compatible.

## Local Development Environment

Required:

- Node.js 20+
- pnpm
- macOS is strongly preferred for full feature testing

Basic startup:

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

Useful commands:

```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm run dist:mac
pnpm run dist:win
pnpm run build:fn-listener
pnpm run build:input-helper
```

## Configuration Model

Environment variables are for local runtime setup and secrets, not for checked-in defaults.

Main groups:

- ASR config
- text refinement provider config
- macOS signing / notarization secrets in GitHub Actions

Never commit:

- real API keys
- Apple account credentials
- signing certificates
- private `.env` values

## Development Rules

When changing behavior, prefer preserving these invariants:

- do not silently degrade paste reliability
- do not break clipboard restoration
- do not regress shortcut start/stop behavior
- do not add provider UI that looks production-ready unless the backend path actually works
- do not change release workflow semantics without updating `CHANGELOG.md` and validating the next tag flow

## Release Process

1. Make code changes on `main`.
2. Update `CHANGELOG.md`.
3. Bump `package.json` version.
4. Validate locally:

```bash
pnpm exec tsc --noEmit
pnpm run build
```

5. Commit the release prep.
6. Push `main`.
7. Create and push a matching `v*` tag.

Example:

```bash
git tag -a v0.1.3 -m "v0.1.3"
git push origin v0.1.3
```

Workflow rules:

- tag must exactly match `package.json` version
- GitHub Release body is extracted from the matching section in `CHANGELOG.md`
- release artifacts are the update source for packaged apps

## Testing Expectations

For changes touching product-critical paths, prefer validating at least one of:

- record -> transcribe -> paste in same app
- record -> switch app -> continue paste
- About page update state rendering
- packaged build / release workflow logic

For UI-only changes:

- run `pnpm exec tsc --noEmit`
- run `pnpm run build`

## Commit Guidance

Prefer clear conventional-style messages, for example:

- `feat: add provider-based ASR settings`
- `fix: improve macOS paste timing`
- `chore: release v0.1.2`

## What To Read Before Specific Work

- Paste / focus issues:
  `electron/main/textInsert.mjs`
  `electron/main/ipcHandlers.mjs`
  `electron/resources/input-helper.swift`
- Recording / timeout issues:
  `electron/main/recordingController.mjs`
  `electron/main/ipcHandlers.mjs`
- UI shell / tabs / settings:
  `src/mainview/App.tsx`
  `src/mainview/components/modules/*`
- Release / update issues:
  `.github/workflows/release.yml`
  `electron/main/updateManager.mjs`
  `CHANGELOG.md`

## Maintenance Note

If this file becomes long or stale, keep `AGENTS.md` as the high-level map and move deeper process details into `docs/` files referenced from here.
