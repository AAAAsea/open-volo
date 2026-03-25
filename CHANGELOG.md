# Changelog

All notable changes to Volo are recorded here.

This project loosely follows Keep a Changelog and uses semantic version tags such as `v0.1.0`.

## [Unreleased]

### Added

## [0.1.0] - 2026-03-25

### Added

- Initial public open-source release.
- Added configurable shortcut finish behavior: release to stop or press again to stop.
- Added microphone selection in settings with device refresh and fallback to the system default input.
- Added per-item copy action in history and a scroll-to-top shortcut while browsing history.
- Added lazy rendering for history records to reduce DOM pressure when switching tabs.
- Added a dedicated macOS app icon pipeline, tray icon assets, and a reusable icon generation script.
- Added GitHub Actions based release automation for macOS and Windows builds.
- Added Windows tray support, debug log panel, and in-app update management.
- Added OpenAI-compatible presets for AI text refinement, including built-in defaults for 豆包 and 智谱 GLM 4.7 Flash.
- Added per-provider AI refinement credential storage and a two-stage processing state for transcription plus AI refinement.
- Added a dedicated `词典` tab for managing hotwords and commonly corrected terms.

### Changed

- Simplified the main app shell into a fixed two-column layout.
- Reduced visual weight in history actions and sidebar navigation.
- Improved friendly time display in history items and removed the redundant `input` label.
- Updated text insertion to verify clipboard content before paste and restore the previous clipboard safely.
- Tuned window sizing, standard macOS window shortcuts, and sidebar interaction polish.
- Changed Windows release packaging from portable to NSIS so packaged builds can participate in `electron-updater`.
- Changed GitHub Actions release uploads to include update metadata files such as `latest*.yml` and `*.blockmap`.
- Renamed AI refinement configuration around a provider preset plus `API Key / Base URL / Model` flow.

### Fixed

- Fixed release automation issues around pnpm workspace detection in CI.
- Fixed Electron Builder CI packaging so artifact creation does not attempt to publish directly from build jobs.
- Fixed AI refinement fallback so when the second stage fails, Volo falls back to the first-stage transcription and continues the paste flow.
- Fixed processing progress and timeout handling across both transcription and refinement stages.
- Fixed bubble positioning so it anchors to the display nearest the cursor instead of always using the primary monitor.
- Fixed Windows window and taskbar behavior for tray-first usage.
- Fixed recognition failure UX by showing a stable retry message while keeping the raw error available in debug logs.
- Fixed startup, permission, cancellation, and temporary file issues in Windows builds.
