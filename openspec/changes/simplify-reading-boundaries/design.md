# 阅读成本优先的边界整理

## 目标与不做的事

本轮采用用户已确认的六项范围，优先减少一次功能阅读中的无意义跳转，而非追求目录对称。保留可独立解释的边界：传输入口校验和授权、应用编排、领域不变量、仓储与数据库映射、缓存失效端口。保持业务行为、错误、顺序、事务和权限不变。不升级依赖，不引入框架，不扩大到访客策略、登录跨标签页或其他缺陷修复。

## 方案取舍

仅补文档虽风险低但保留主要跳转负担；全目录迁移虽整齐但增加 diff 和维护成本。本方案只清理已证实的空层和归属错误。不同职责的文件继续分开，不建立新万能 mapper、泛型 CRUD 或兼容 facade。

## 文件与责任

1. 文章命令：删除 application/post-use-cases.ts 空导出，router 直接导入 post-commands.ts；将 post-command-handlers.ts 的状态更新编排合入命令文件，以明确名称的局部函数保留原分支与聚合调用。发布、撤回的既有测试迁移到同一所有者，不删除规则。用户 command-handlers 仅在同等单一用途情形合入 user-commands；查询错误映射保持独立。
2. 数据契约：category、link、page、post、tag、user 的 presentation 文件只定义同义别名，删除这些文件。features/contracts/content.ts 直接从权威 application 模型导出公开名字，既有消费端不必大面积改名。CategoryListItem 在所属 application 明确命名并保留 deepPath；不要误用缺少该字段的 CategoryRecord。评论公开 DTO 的实际脱敏转换和媒体有独立语义的模型保留。
3. 展示选项：PostStatus/PostType、PageStatus/PageTemplate、CommentStatus、EnableStatus、UserLevel/UserStatus、MenuType 的名称与选项迁到 packages/ui/admin 下具名模块。既有字符串、顺序和选项集合逐项保留；领域枚举、规则仍由原文件唯一持有。消费端拆分枚举和 UI 导入，禁止 domain 反向导入 UI。
4. 用户运行时：features/contracts/admin/use-current-user.ts 移到 packages/ui/admin/use-current-user.ts，保留 Provider、Hook、权限调用与查询配置。契约目录只导出共享数据和 schema，不创建网络查询或 React context。
5. 组合根：评论 UI 的 queryCommentPromise 使用所属 feature 的已存在结果契约，不再引用 app/lib/server/public-queries 的函数类型。app 仍负责框架缓存、请求内去重与页面组合，不整体搬家。
6. 阅读地图：以文章写入、公开读取、当前用户三条真实路径说明入口及边界，README 链接到简短文档。历史审计保留时间属性，标注被本轮替代的旧结论，避免当前目录指引失真。

## 验证与交付

先用架构测试表达目标边界并确认当前实现触发失败，再迁移代码。保留原有命令、状态、错误映射、公开 DTO、权限、缓存和事务行为测试；增加展示标签/选项精确值及顺序测试。更新导入和测试目标不得删除原安全边界断言。执行类型检查、lint、规格校验、完整覆盖率、进程测试和构建；CI 执行原有开发及生产 E2E。数据库测试仅使用独占可丢弃本地库，不读取真实环境变量。独立审查后提交 PR，跟踪 CI/预发至终态；不合并、不手动生产部署。

## 验收

文章更新从 router 到实际命令不再经过空导出或同名 updatePost 二次跳转；contracts 不承载运行时 UI；domain 不输出展示名称和下拉选项；展示类型不经过无语义的别名文件；评论 UI 不反向依赖 app。相关行为与完整质量门禁保持通过。文件数量仅作为辅助信息，不作为目标。
