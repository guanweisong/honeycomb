## Context

审计发现直接依赖的已知漏洞，其中富文本清洗和数据库 ORM 在生产路径使用。`shadcn` 仅在开发时作为 CLI 使用，却被安装到生产依赖树。

## Goals / Non-Goals

**Goals:** 修复四个直接依赖漏洞，并让组件生成 CLI 不进入生产部署。

**Non-Goals:** 不执行全量依赖升级，不替换主题切换组件，不修改业务代码。

## Decisions

- 仅升级到审计已修复的兼容版本：`sanitize-html@2.17.6`、`drizzle-orm@0.45.2`、`next-intl@4.13.6` 与 `postcss@8.5.26`。
- 将 `shadcn` 从 `dependencies` 移至 `devDependencies`；它不是运行时模块。

## Risks / Trade-offs

- [兼容性回归] → 执行类型检查、单元测试、构建与漏洞复审。
