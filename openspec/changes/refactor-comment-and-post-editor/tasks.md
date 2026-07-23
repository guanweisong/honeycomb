## 1. 评论客户端拆分

- [ ] 1.1 补充评论身份、提交负载和树渲染的特征测试
- [ ] 1.2 抽取 `useCommentIdentity`，保持 localStorage 读写行为
- [ ] 1.3 抽取 `useCommentSubmission`，保持 CAPTCHA、mutation、刷新和清理顺序
- [ ] 1.4 抽取 `CommentForm`、`CommentTree` 和 `CommentItem`
- [ ] 1.5 将 `client.tsx` 收敛为状态协调和组件组合入口
- [ ] 1.6 运行评论前端相关测试与类型检查

## 2. 文章编辑器拆分

- [ ] 2.1 为表单默认值、标准化和类型专属提交负载补充特征测试
- [ ] 2.2 抽取并测试 `normalizePostForm` 纯函数
- [ ] 2.3 抽取 `usePostEditor`，迁移详情查询、mutation、封面和提交编排
- [ ] 2.4 抽取 `PostEditorActions` 和文章、电影、图库、引言字段组件
- [ ] 2.5 将 `page.tsx` 收敛为路由参数、Suspense 和编辑器组合入口
- [ ] 2.6 运行文章编辑器相关测试与类型检查

## 3. 评论 API 分层

- [ ] 3.1 使用现有 Router 测试锁定 procedure 输入、输出、权限和错误行为
- [ ] 3.2 将公共评论映射迁移到 `comment.dto.ts`
- [ ] 3.3 将资源可见性和父子同源校验迁移到 `comment-target.service.ts`
- [ ] 3.4 将私有通知上下文和邮件发送迁移到 `comment-notification.service.ts`
- [ ] 3.5 在 `comment.service.ts` 实现后台列表、公共列表、创建、更新和删除用例
- [ ] 3.6 将 `comment.router.ts` 收敛为 procedure、权限和输入绑定
- [ ] 3.7 运行评论 API 测试确认契约不变

## 4. 全面验证

- [ ] 4.1 搜索旧实现和重复逻辑，确认所有调用已迁移
- [ ] 4.2 运行 TypeScript 类型检查和 ESLint
- [ ] 4.3 运行完整单元测试套件
- [ ] 4.4 运行 Next.js 生产构建并检查 Git 差异
