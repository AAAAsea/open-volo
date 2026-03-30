# Changelog

All notable changes to Volo are recorded here.

This project loosely follows Keep a Changelog and uses semantic version tags such as `v0.2.0`.

## [Unreleased]

## [0.2.4] - 2026-03-30

### Fixed

- Fixed translate mode activation so configuring a translate shortcut now enables the feature without requiring a separate hidden toggle.

## [0.2.3] - 2026-03-29

### Fixed

- Fixed macOS in-app install flow so clicking `退出并安装` now goes through `electron-updater.quitAndInstall()` instead of only quitting the app.

### Changed

- Changed update checks to run automatically on app launch and then at most once every 24 hours.
- Refined the About page update card to emphasize current status, show a clearer `当前已是最新版本` state, and add animated feedback while checking or installing.

## [0.2.2] - 2026-03-29

### Fixed

- Fixed config field clearing bug: editing one field no longer resets other fields
- Fixed TypeScript errors in CI checks (removed unused variables, fixed type definitions)

## [0.2.1] - 2026-03-28

### Added

- Added animated splash screen on startup (pulsing logo + bouncing dots)
- Added branch management documentation (all changes via Pull Requests)

### Changed

- Simplified Doubao ASR config: only 3 required fields (APPID, Token, Secret Key), Flash URL moved to advanced settings
- Removed model selector for Doubao ASR (Flash mode only, aligned with app positioning)

### Fixed

- Fixed macOS auto-update: app now quits and applies update on next launch (DMG updates don't support auto-restart)
- Fixed global text selection: body text is now non-selectable, only inputs/textareas remain selectable

## [0.2.0] - 2026-03-28

### Added

- Added **translate mode**: a second independent shortcut triggers ASR → AI translation → paste. Supports 8 target languages.
- Added 4 translate prompt presets (standard, concise, formal, casual) with `{language}` placeholder.
- Added mode tabs in Settings to configure input and translate independently (shortcut + prompt per mode).
- Added mode tag (input / translate) to each history item for quick visual identification.
- Added CSV export button to history module (UTF-8 BOM for Excel compatibility).
- Added macOS title bar drag region for `hiddenInset` window style.
- Added keyboard shortcut support for translate mode (hold-to-record and press-again).
- Added translate shortcut to system tray context menu.
- Added markdown rendering for release notes in the About tab (with DOMPurify sanitization).

### Changed

- **Home page**: now display-only — shows both input and translate shortcuts as status cards. Shortcut editing moved to Settings.
- **Settings page**: restructured with mode tabs (语音输入 / 翻译) for per-mode config, plus shared settings below.
- **AI service config** (Provider, API Key, Base URL, Model) is now a single shared section used by both modes.
- Status hints now include a "翻译模式" prefix when recording in translate mode.
- Window background changed to warm tone (#f4eee6) with macOS `hiddenInset` title bar.

### Fixed

- Fixed global text selection — body text is now non-selectable, only inputs/textareas remain selectable.

## [0.1.2] - 2026-03-26

### Added

- Added a release notes extraction step so GitHub Releases now use the matching `CHANGELOG.md` section instead of generic compare links.

### Changed

- Changed the About tab icon presentation to use the app image directly with rounded corners and shadow, without the extra framed padding layer.
- Changed the Doubao ASR field label from `Access Secret` to `Secret Key`.
- Changed the 智谱 preset label to the shorter `智谱`.
- Changed the recording time limit from 60 seconds to 1 hour.

### Fixed

- Fixed tab switching so the main content area now scrolls back to the top when entering a new section.
- Fixed About tab release notes rendering by stripping HTML-only compare output into readable text and falling back to the GitHub Releases page when no meaningful notes exist.
- Fixed the first About tab open feeling delayed by preloading the app icon and moving section switching onto a transition.

## [0.1.1] - 2026-03-25

### Added

- Added provider-based ASR settings, so speech recognition credentials are now grouped by service provider and no longer look like unlabeled generic fields.
- Added a dedicated `关于` tab that brings app identity, version details, updates, and debug tools into one place.

### Changed

- Changed the ASR settings panel to expose Doubao-specific fields explicitly, while reserving a separate config bucket for future compatible providers.
- Changed the Doubao ASR form to keep only the three required fields: `APPID`, `Access Token`, and `Access Secret`.
- Changed settings layout so the speech recognition section uses the full content width instead of reading like a half-card panel.

### Fixed

- Fixed the main app stage so the local `润色中` UI ends as soon as final text arrives, instead of lingering after paste has already finished.

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
