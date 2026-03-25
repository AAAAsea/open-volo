# Contributing

感谢你关注 Volo。

## 开始之前

- 提交 issue 或 PR 前，先确认问题是否已经被报告
- 不要提交任何真实密钥、证书、账号或个人敏感信息
- 涉及用户可见行为、打包链路或发布流程的改动，请同步更新 `CHANGELOG.md`

## 本地开发

```bash
pnpm install
cp .env.example .env
pnpm run dev
```

常用命令：

```bash
pnpm exec tsc --noEmit
pnpm run build
```

macOS 相关 helper 会在开发或构建时自动从 Swift 源码编译，本仓库不提交它们的二进制产物。

## Pull Request 建议

- 保持改动聚焦，避免把不相关的重构和功能堆进同一个 PR
- 如果修改了跨应用粘贴、权限、快捷键、录音、发布或更新链路，请附上复现与验证方式
- 修改配置、文档或发布流程时，请一起更新对应说明

## Code Style

- 优先保持现有代码风格和目录结构
- 新增逻辑先考虑最小改动和可回退性
- 删除废弃文件或生成物时，确认仓库中没有残留引用
