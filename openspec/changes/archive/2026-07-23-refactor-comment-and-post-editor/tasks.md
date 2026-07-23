## 1. 评论客户端拆分

- [x] 1.1 补充评论身份、提交负载和树渲染的特征测试
- [x] 1.2 抽取 `useCommentIdentity`，保持 localStorage 读写行为
- [x] 1.3 抽取 `useCommentSubmission`，保持 CAPTCHA、mutation、刷新和清理顺序
- [x] 1.4 抽取 `CommentForm`、`CommentTree` 和 `CommentItem`
- [x] 1.5 将 `client.tsx` 收敛为状态协调和组件组合入口
- [x] 1.6 运行评论前端相关测试与类型检查

## 2. 文章编辑器拆分

- [x] 2.1 为表单默认值、标准化和类型专属提交负载补充特征测试
- [x] 2.2 抽取并测试 `normalizePostForm` 纯函数
- [x] 2.3 抽取 `usePostEditor`，迁移详情查询、mutation、封面和提交编排
- [x] 2.4 抽取 `PostEditorActions` 和文章、电影、图库、引言字段组件
- [x] 2.5 将 `page.tsx` 收敛为路由参数、Suspense 和编辑器组合入口
- [x] 2.6 运行文章编辑器相关测试与类型检查

## 3. 评论 API 分层

- [x] 3.1 使用现有 Router 测试锁定 procedure 输入、输出、权限和错误行为
- [x] 3.2 将公共评论映射迁移到 `comment.dto.ts`
- [x] 3.3 将资源可见性和父子同源校验迁移到 `comment-target.service.ts`
- [x] 3.4 将私有通知上下文和邮件发送迁移到 `comment-notification.service.ts`
- [x] 3.5 在 `comment.service.ts` 实现后台列表、公共列表、创建、更新和删除用例
- [x] 3.6 将 `comment.router.ts` 收敛为 procedure、权限和输入绑定
- [x] 3.7 运行评论 API 测试确认契约不变

## 4. 全面验证

- [x] 4.1 搜索旧实现和重复逻辑，确认所有调用已迁移
- [x] 4.2 运行 TypeScript 类型检查和 ESLint
- [x] 4.3 运行完整单元测试套件
- [x] 4.4 运行 Next.js 生产构建并检查 Git 差异

## 5. 组件目录规范

- [x] 5.1 将本次新增组件迁移为 `components/组件名/index.tsx`
- [x] 5.2 修正组件内部和调用方导入，保持导出接口不变
- [x] 5.3 重新运行类型检查、ESLint、完整单测和生产构建

## 6. 评论类型去重

- [x] 6.1 从 Drizzle Schema 导出统一的 `CommentRecord`
- [x] 6.2 使用 `Pick` 派生公共 DTO、目标和邮件评论类型
- [x] 6.3 复用 Schema 已导出的输入类型并审计其余手写形状
- [x] 6.4 重新运行类型检查、ESLint、完整单测和生产构建
