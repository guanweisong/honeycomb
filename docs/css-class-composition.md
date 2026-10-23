# CSS 类名组合

项目直接从官方 `cn` 包导入 `cn`，组合条件类名并解决 Tailwind 冲突；只需条件拼接、不应改变已有冲突语义时使用该包的 `clsx` 导出。无需本地转导出壳。`cn` 0.5.0 对应官方仓库 https://github.com/shadcn-ui/cn ，目前使用 Tailwind CSS 4.3.3。

迁移已删除旧 helper，移除 `clsx` 与 `tailwind-merge` 的直接依赖；第三方库自身的间接 `clsx` 依赖由包管理器正常保留。契约测试位于 `tests/integration/css-class-contract.test.ts`，覆盖条件输入、覆盖顺序、变体、自定义主题类与任意值，不以依赖微基准宣称工程性能提升。

## shadcn 生成配置

现有 shadcn 4.22.1 已支持官方 registry 直接导入 `cn`，无需升级。`components.json` 的 `aliases.utils` 仍是 CLI schema 必填的本地生成目标，因此保留默认 `@/lib/utils` 槽位，但不创建该文件，也不把此字段指向 npm 包或 node_modules。此字段不是运行时导入或启用 `cn` 的开关。

新增官方组件可先运行 `bunx shadcn add button --dry-run --view` 检查生成结果直接导入 `cn`。旧第三方 registry 若依赖 `utils` item，可能重新生成 helper，必须审查其输出并迁移导入，不把旧 registry 的生成结果误当已兼容。当前源码没有本地 `cn` wrapper；工具路径门禁区分真实模块解析和保留生成目标。
