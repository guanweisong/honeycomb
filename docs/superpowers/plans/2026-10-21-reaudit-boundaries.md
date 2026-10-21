# 全仓复审边界修复实施计划

> 本文保留实施前的检查清单，勾选状态不作为当前进度；逐项实际处置、验证与未完成项以[实施记录及账本](../../skill-reaudit-implementation.md)为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 逐项验证并实施3d668455复审中有实际收益的修复，保留完整处置与验证证据。

**Architecture:** 在现有业务所有者与技术边界就地修复。复用已有世代隔离、schema和原生平台能力，不引入新框架或纯目录搬迁。模块并行但统一集成，最终精确提交CI验证。

**Tech Stack:** Next 16.4、React 19.3、TypeScript、tRPC、Drizzle/libSQL、Vitest、Playwright。

**Spec:** openspec/changes/remediate-skill-reaudit/proposal.md、design.md及specs。

## Global Constraints

- 保留扁平菜单、普通媒体hover/no lifecycle、仅分类无100删除上限。
- 保留QUOTE双语/回退、日期范围、版本写入、待审核动作与CUSTOM邮件无目标链接。
- 不改生产数据、不创建凭据、不合并或部署、不升级依赖。
- 邮箱方案已获用户确认：未来后台创建/明确修改时小写并事务内防碰撞，原样历史邮箱不改，歧义审计不归属；不迁移数据、不改用户名登录。性能只报告实测。
- 每项先追踪真实调用链，再失败回归、最小实现、针对性绿测；全套集成门禁不重复并行运行。

## Review Focus

- 关闭重开、A→B→A、账户切换：旧回调不干扰新草稿和busy。
- 404与并行请求拒绝：原错误有归属，不变成未处理拒绝或吞错空数据。
- 静默对象流与未知写结果：截止时间释放资源但不误报确定未提交。
- 重叠分页和单语内容：合法响应不能被启发式永久丢弃。
- 320px/缩放/键盘/减弱动态：控件可达有名称、焦点可见。

## 任务 1：R01 公开页面作者缓存失效路径漏掉路由组

**文件：** `src/lib/cache/next-public-content-invalidator.ts`；`src/app/lib/server/public-queries.ts`；`src/features/user/server/user-commands.ts`；`src/lib/cache/next-public-content-invalidator.test.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：先修失效路径与真实标签匹配，避免作者改名后页面继续显示旧署名。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 2：R02 旧弹窗保存完成可能关闭新会话并丢草稿

**文件：** `src/features/category/admin/components/CategoryFormDialog/index.tsx`；`src/features/tag/admin/components/TagFormDialog/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：分类已确认，标签同类位置见明细；只允许当前提交会话关闭自己。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 3：R03 页面详情提前启动的评论请求没有及时接管拒绝

**文件：** `src/app/(blog)/[locale]/pages/[id]/page.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：覆盖慢详情、评论先失败和详情404，不用空评论吞掉错误。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 4：R04 媒体分页把合法重复ID页误判成旧响应而卡住

**文件：** `src/features/media/shared/media-query.ts`；`src/features/media/shared/media-query.integration.test.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：以查询页/placeholder来源判定响应，不以内容相同代替请求身份。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 5：R05 编辑器外部值同步被当成用户输入

**文件：** `src/components/editor/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：prop同步时 emitUpdate:false，并验证 reset 后没有伪造脏状态。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 6：R06 R2完整流没有应用级截止时间

**文件：** `src/lib/storage/r2-storage.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：请求和body共用截止时间与abort，验证静默流销毁及验证槽释放。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 7：R07 大小写邮箱写入与失败登录审计查找不一致

**文件：** `src/features/user/account-security/server/login-history.repository.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：统一身份规范化并处理既有大小写冲突；不扩大为账号接管结论。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 8：R08 合法写入的纯空白密码被登录表单拒绝

**文件：** `src/features/user/login/login.schema.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：登录不得trim密码。仅纯空白触发，不声称普通前后空格会被发送时删掉。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 9：R09 移动视口存在屏幕外的返回顶部与媒体选择面板

**文件：** `src/app/(blog)/components/BackToTop/index.tsx`；`src/features/media/components/PhotoPicker/index.tsx`；`src/features/user/login/components/LoginClient/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：使用移动端有界基线，补320/390/768px和缩放验证。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 10：R10 有效英文单语字段在后台默认显示为空

**文件：** `src/components/admin/MultiLangText/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：保留双语切换，并在当前语言无内容时回退到实际存在的翻译。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 11：R11 管理图标操作与独立筛选复选框缺少可访问名称

**文件：** `src/features/comment/admin/components/CommentPageShell/index.tsx`；`src/components/MultiSelect/index.tsx`；`src/features/user/admin/components/UserPageShell/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：按角色和名称测试真实控件，不靠按钮顺序或空文本断言。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 12：R20 文章更新的旧请求仍刷新并反馈，且占用新记录提交状态

**文件：** `src/features/post/admin/edit/hooks/use-post-editor.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：详见触发、证据及最小建议。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 13：R12 表单标签、tabpanel焦点与减少动态效果仍有缺口

**文件：** `src/components/editor/components/ToolbarLinkItem.tsx`；`src/features/comment/admin/components/CommentPageShell/index.tsx`；`src/components/ui/tabs.tsx`；`src/app/admin/components/AdminNavigation/index.tsx`；`src/features/post/admin/edit/components/PostTypeFields/index.tsx`；`src/features/user/admin/account-security/components/PasswordSettings/index.tsx`；`src/features/user/login/components/LoginClient/index.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：补关联标签/可见焦点与 reduced-motion；不宣称已测浏览器读屏行为。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 14：R13 测试替身仍绕过真实契约

**文件：** `src/auth-build.test.ts`；`src/app/admin/(dashboard)/components/AdminClientShell/index.test.tsx`；`src/components/editor/components/ToolbarGroupItem.test.ts`；`src/features/media/components/PhotoPicker/index.test.tsx`；`src/features/link/admin/link-actions.test.ts`；`src/features/link/admin/link-transforms.test.ts`；`src/features/link/tests/link.router.test.ts`；`src/features/media/shared/MediaPageShell/index.test.tsx`；`src/features/media/shared/media-query.test.ts`；`src/features/menu/admin/menu-actions.test.ts`；`src/features/menu/admin/menu-transforms.test.ts`；`src/features/menu/tests/menu-router-index.test.ts`；`src/features/menu/tests/menu.router.test.ts`；`src/features/post/public/Tags/index.test.tsx`；`src/features/user/tests/user.router.test.ts`；`src/lib/db/schema.test.ts`；`src/lib/trpc/client/admin-query-client.test.ts`；`src/features/post/admin/edit/components/PostSidebarFields/index.test.tsx`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：优先修会掩盖真实字段/目标ID/时间戳的fixture；第三方适配只保留有理由的窄边界。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 15：R14 部分测试断言因无关错误或不真实可见性而失真

**文件：** `src/features/post/schema.test.ts`；`src/features/post/tests/post-router-read.test.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：枚举负例补合法创建令牌；guest成功fixture必须是公开记录。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 16：R15 授权静态门禁存在两条可复现漏检

**文件：** `tests/helpers/capability-authorization-static.ts`；`tests/architecture/admin-action-guards.test.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：当前 UserLevel 别名与直接 guard || true 反例均补入；不是生产权限绕过证据。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 17：R16 少量输入/语言成员仍有平行权威定义

**文件：** `src/features/link/schema.ts`；`src/features/link/types.ts`；`src/features/menu/admin/menu-transforms.ts`；`src/features/menu/schema.ts`；`src/features/post/server/post-translations.ts`；`src/lib/db/schema/content-category.ts`；`src/features/comment/server/comment-notification-repository.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：从实际 schema/语言目录派生；setting唯一约束已阻止多行，后者是规范对齐而非现时错读。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 18：R17 嵌套分类sitemap路径与导航祖先链不一致

**文件：** `src/app/sitemap-data.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：按真实parent链生成同一URL，不改变用户要求的扁平菜单呈现。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 19：R18 测试隔离与清理存在小范围缺口

**文件：** `src/features/dashboard/server.integration.test.ts`；`src/features/media/server/media-delete-outcomes.test.ts`；`src/features/media/server/registration.integration.test.ts`；`src/lib/storage/r2-storage.test.ts`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：finally嵌套保证客户端关闭；R2组独立配置并恢复合成环境。不泛称每个fixture缺信号处理都是缺陷。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。

## 任务 20：R19 历史验证摘要应明确仅分类删除取消数量上限

**文件：** `openspec/changes/reconcile-react-correctness-fixes/verification.md`及其相邻行为测试。

**接口：** 保留上述模块现有公开调用签名；只在实际需要处增加有类型的可选UI属性，不新增平行契约。

- [ ] 读取以上实现、所有调用方、当前测试和该组明细触发条件。
- [ ] 先添加能在原实现失败的回归，断言实际返回/可见状态/副作用，不仅断言mock被调用。针对现有不真实fixture则先用权威类型暴露错误。
- [ ] 用 `node node_modules/vitest/vitest.mjs run <该组相关测试>` 确认预期失败；导入/环境错误不能算红证据。
- [ ] 实施最小根因修复：其他资源保留有界批量契约，不以本次审阅擅自取消。
- [ ] 同命令验证通过，保留原边界断言；在逐项账本记录实际命令和限制，集成者统一提交。
