# Contributing

感谢你关注 Volo。

## 开始之前

- 提交 issue 或 PR 前，先确认问题是否已经被报告
- 不要提交任何真实密钥、证书、账号或个人敏感信息
- 涉及用户可见行为、打包链路或发布流程的改动，请同步更新 `CHANGELOG.md`

## 分支管理

**禁止直接推送到 `main` 分支。**

所有改动必须通过 Pull Request 合并：

1. 从 `main` 创建功能分支：
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature-name
   ```

2. 在功能分支上开发、提交、推送：
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

3. 在 GitHub 上创建 Pull Request，等待审核通过后合并到 `main`

4. 合并后删除功能分支

**分支命名建议：**
- `feature/xxx` — 新功能
- `fix/xxx` — Bug 修复
- `refactor/xxx` — 代码重构
- `docs/xxx` — 文档更新
- `chore/xxx` — 构建、配置等杂项

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

## 发布流程

维护者操作：

1. 确保 `main` 分支所有改动已就绪
2. 更新 `package.json` 版本号
3. 更新 `CHANGELOG.md`
4. 提交版本改动：
   ```bash
   git add .
   git commit -m "chore: bump version to x.y.z"
   git push origin main
   ```
5. 创建并推送 tag：
   ```bash
   git tag vx.y.z
   git push origin vx.y.z
   ```
6. GitHub Actions 自动构建并发布到 GitHub Releases

## Code Style

- 优先保持现有代码风格和目录结构
- 新增逻辑先考虑最小改动和可回退性
- 删除废弃文件或生成物时，确认仓库中没有残留引用
