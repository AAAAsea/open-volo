<p align="center">
  <img src="./assets/branding/volo.png" alt="Volo logo" width="180" />
</p>

<h1 align="center">Volo</h1>

<p align="center">
  面向 macOS 和 Windows 的开源桌面语音输入应用。
</p>

<p align="center">
  <strong>中文</strong> · <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-37-47848F?logo=electron&logoColor=white" alt="Electron 37" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-111827" alt="macOS and Windows" />
  <img src="https://img.shields.io/badge/License-MIT-16A34A" alt="MIT License" />
</p>

Volo 是一个基于 Electron 的桌面语音输入应用。它通过快捷键唤起悬浮胶囊，完成录音、云端转写、可选文本修正，并把最终结果回填到当前输入场景。

当前仓库以 macOS 体验为优先，同时保留 Windows 的打包与分发链路。

## 亮点

- 按住说话、松开结束的快捷键流程
- 悬浮胶囊展示录音、转写和润色状态
- 跨应用粘贴与剪贴板恢复
- 历史记录、词典与调试日志
- 支持 OpenAI-compatible 的 AI 文本修正

## 技术栈

- 桌面框架：Electron
- 前端：React 19 + Vite 6 + Tailwind CSS
- 语音识别：豆包 / 火山引擎 ASR
- 文本修正：OpenAI-compatible providers
- 打包发布：electron-builder + GitHub Actions
- 自动更新：electron-updater + GitHub Releases

## 快速开始

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

## 本地开发

1. 安装依赖

```bash
pnpm install
```

2. 复制环境变量模板并填写自己的服务配置

```bash
cp .env.example .env
```

3. 启动开发环境

```bash
pnpm run dev
```

常用命令：

```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm run dist:mac
pnpm run dist:win
pnpm run generate:icons
```

打包产物默认输出到 `release/` 目录。

## 项目结构

- `electron/`：主进程、权限、录音控制、跨应用粘贴、更新管理
- `src/mainview/`：主 React 界面、悬浮胶囊 UI、设置与历史记录
- `scripts/`：helper 构建、图标生成、notarize、release notes 提取脚本
- `assets/`：品牌图标与应用打包图标

## Helper 与本地二进制

macOS 相关的 Swift helper 只以源码形式保留，不提交编译产物：

- `electron/resources/fn-monitor.swift`
- `electron/resources/input-helper.swift`

本地开发时会按需自动编译；`pnpm run build` 也会在 macOS 上先生成这些二进制再参与打包。

## 配置

仓库提供了 [.env.example](./.env.example) 作为模板，主要包含：

- ASR 接入参数
- 文本修正 provider 配置
- 调试与运行时开关

请不要提交真实密钥、证书或账号凭据。

## 版本与发布

- 变更记录维护在 [CHANGELOG.md](./CHANGELOG.md)
- 发布工作流定义在 [release.yml](./.github/workflows/release.yml)
- 推送类似 `v0.1.2` 的 tag 时，CI 会先校验 tag 与 `package.json` 版本一致，再开始构建

GitHub Releases 同时也是自动更新源：

- macOS 使用 `zip + latest-mac.yml`
- Windows 使用 `NSIS + latest.yml`

开发环境默认不检查更新，请使用打包产物验证完整升级流程。

### 维护者说明

如果要在 GitHub Actions 中发布 macOS 版本，需要为仓库配置以下 secrets：

- `APPLE_CERTIFICATE_P12_BASE64`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

本地手动发布 macOS 可使用：

```bash
pnpm run dist:mac:signed
pnpm run notarize:mac
```

## 开源协作

- License: [MIT](./LICENSE)
- 贡献说明：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 如果改动影响用户可见行为、打包链路或发布流程，请同步更新 `CHANGELOG.md`

## 维护约定

- 尽量让 CI 和本地打包复用同一条链路
- 发布前确认 `CHANGELOG.md`、`package.json` 和 Git tag 三者一致
