## Why

友情链接已经切换为 `page` 方案，相关页面不再依赖写死路由，也就不需要再用 `LINK_OBJECT_ID` 作为友情链接页的特殊标识。继续保留这个环境变量只会让评论链接、设置返回值和文档说明继续携带过时约定，增加维护成本和认知负担。

## What Changes

- 移除 `LINK_OBJECT_ID` 环境变量及其在代码中的读取逻辑。
- 删除评论链接中的友情链接页特判，不再把自定义评论对象映射到固定的 `/links` 地址。
- 调整网站设置和评论邮件上下文中与友情链接页对象 ID 相关的返回结构。
- 清理 README 中的环境变量示例和说明。
- 更新相关测试，确保新的行为不再依赖该环境变量。

## Capabilities

### New Capabilities
- `comment-link-cleanup`: 规范评论上下文中自定义页面链接的解析方式，移除对友情链接页专用 ObjectId 的依赖。

### Modified Capabilities

## Impact

- `src/packages/trpc/api/utils/getCustomCommentLink.ts`
- `src/packages/trpc/api/utils/comment.ts`
- `src/packages/trpc/api/modules/setting/setting.router.ts`
- `src/packages/trpc/api/modules/comment/comment.router.ts`
- `README.md`
- 相关单元测试
