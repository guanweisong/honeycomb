## Context

博客评论客户端约 360 行，混合浏览器身份存储、CAPTCHA、mutation、回复状态、表单和递归渲染；后台文章编辑页约 470 行，混合表单转换、数据请求、封面状态、标签状态、动作和四类文章字段；评论 Router 约 290 行，混合 procedure 声明、查询、DTO、写入及邮件通知。

这些文件属于高频修改路径。目标不是追求固定行数，而是让每个模块具备单一可描述职责，并保持全部外部行为不变。

## Goals / Non-Goals

**Goals:**

- 将评论客户端拆为身份、提交、表单和树渲染模块。
- 将文章编辑器拆为纯数据转换、编辑器编排、动作和类型字段模块。
- 将评论 Router 收敛为薄入口，把业务编排放入 service。
- 保持 UI、交互、路由、tRPC 契约、错误码和数据库行为不变。
- 使用现有测试和新增聚焦测试验证迁移。

**Non-Goals:**

- 不重新设计页面视觉或交互。
- 不修改评论、文章或页面的业务规则。
- 不建设通用表单生成器、通用 CRUD 框架或 Repository 层。
- 不修改数据库 Schema、依赖和部署配置。

## Decisions

### 按垂直职责拆分评论客户端

保留 `client.tsx` 作为唯一组合入口。`useCommentIdentity` 封装现有 localStorage key 和用户信息；`useCommentSubmission` 封装 CAPTCHA token、mutation、刷新和成功清理；`CommentForm` 只呈现输入和验证码；`CommentTree` 与 `CommentItem` 负责递归显示及回复事件。

替代方案是把所有逻辑放入单个大型 Hook，但这只会转移复杂度，且让渲染与副作用仍难以独立理解。

### 文章编辑器采用 Hook 加类型组件

`normalizePostForm.ts` 承载无副作用的数据转换并直接测试。`usePostEditor` 编排查询、mutation、封面及提交状态。页面保留路由参数、Suspense 和组件组合。文章、电影、图库、引言字段按现有 JSX 边界拆分；操作按钮单独组件化。

不会抽象跨页面编辑器框架，也不会改变 React Hook Form 的字段注册和 watch 方式。

### 评论 API 以用例级 Service 收敛

`comment.router.ts` 仅做 procedure 和输入绑定。`comment.dto.ts` 负责公共 DTO；`comment-target.service.ts` 负责可见性及父子同源；`comment-notification.service.ts` 负责私有通知上下文和邮件发送；`comment.service.ts` 提供后台列表、公共列表、创建、更新和删除用例。

Service 接收显式 `db` 和必要请求元数据，避免依赖 tRPC context，从而可以独立测试。现有事务顺序、查询投影和异步邮件行为保持不变。

### 采用渐进式特征测试

每个子系统先使用现有测试锁定行为，再为纯转换和 service 边界增加聚焦测试。完成一个子系统后立即运行其测试，再进入下一个，最终执行全量验证。

## Risks / Trade-offs

- [拆分后 props 过多] → 只传递子组件真实需要的值；若多个相邻组件共享同一组编辑器状态，再由局部 Hook 提供，不新增全局 Context。
- [Hook 闭包改变提交行为] → 保留当前依赖和调用顺序，用提交负载测试验证。
- [Client Component 边界扩大] → 所有交互子组件从现有 `"use client"` 入口导入，不引入服务端模块。
- [Service 迁移改变邮件时序] → 保持写入、读取 setting、管理员通知、父评论通知的现有顺序与异步 `.catch` 行为。
- [纯重构产生无效抽象] → 模块必须有单一职责和至少一个实际调用者，不创建未来用途接口。

## Migration Plan

1. 锁定评论客户端关键交互和数据转换行为，逐个抽取 Hook 与组件。
2. 锁定文章表单转换和提交行为，抽取工具、Hook、动作和类型字段。
3. 锁定评论 Router 契约，将用例迁移至 DTO、目标、通知和主 service。
4. 搜索旧实现和重复逻辑，确认所有调用已迁移。
5. 运行类型检查、Lint、全量测试和 Next.js 生产构建。

所有变更均为源码重组，可通过回退单次提交恢复，不涉及数据迁移。

## Open Questions

无。文件命名可在实现中根据现有目录命名风格做等价调整，但职责边界不得合并回大型单元。
