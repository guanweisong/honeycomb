## Context

Feature 目录目前混放业务服务操作与浏览器页面、组件、React hooks、表格列定义和展示 helper。Next.js 路由已经归 `src/app`，但不少路由文件仍只是转导出 feature 内的 UI。应用侧 UI 放在实际拥有该页面或交互的路由 `components` 目录；目录中不放 `page`、`layout` 或 `route` 等 App Router 入口。

本次将浏览器渲染的页面与交互代码迁入 `src/app`。评论通知中的 React Email 模板仍归通知投递功能，因为它生成邮件内容，不由应用路由渲染。

## Goals / Non-Goals

**Goals:**

- 清除 `src/features` 中的浏览器页面、展示组件、客户端 hooks、tRPC 客户端 action/query、编辑草稿状态、表格列、选项列表及展示 helper。
- 将 UI 放到实际使用它的应用路由组：博客 UI 归 `src/app/(blog)`，后台 UI 归 `src/app/admin`，登录 UI 归登录路由。
- 保留 feature 的 server 操作、数据库查询、规则、schema、业务类型和非 UI 转换。
- 保留导出名、RSC/client 边界、URL、交互和现有 UI 测试场景。
- 更新静态/动态导入、mock、夹具、边界门禁和当前架构说明；不留旧路径转出口。

**Non-Goals:**

- 移动通知邮件模板、数据库/server 操作、业务 schema 或领域规则。
- 改变页面行为、URL、授权、数据契约、事务、缓存失效、媒体注入或依赖。
- 只因纯业务 helper 被 UI 使用就移动它。

## Decisions

1. **按真实路由归属应用 UI，共享组件直接放 dashboard 组件根目录。** 后台页面各自使用路由内的 `components`：如 `comment/components`、`dashboard/components`、`media/components`、`post/edit/components`、`page/list/components` 和 `account/security/components`。真正跨页面复用的后台 UI 直接放在 `src/app/admin/(dashboard)/components` 下，以组件自身命名，不按业务建立子目录。路由专属业务 action 与 options 放在对应路由根下，例如 `user/user-actions.ts`、`page/edit/page-editor-actions.ts`、`post/options.ts`；`components` 只放 UI 组件。路由专属 UI 不集中到 dashboard 根目录。不在 `src/app/admin/(dashboard)/components` 下建立 `features` 或业务目录；所有 `components` 目录都不得包含 `page`、`layout` 或 `route` 等 App Router 入口。外层后台 Provider 或布局使用的 UI 仍放在 `src/app/admin/components`。博客 UI 放在 `src/app/(blog)/components`，登录 UI 放在 `src/app/admin/login/components`。原 feature `page.tsx` 实现直接落到现有真实路由 `page.tsx`，不再保留 feature 页面副本。
2. **迁移浏览器层，保留业务层。** feature 的 `admin` 与 `public` 目录中的浏览器模块整体迁入 app，包括组件、React hooks、客户端 tRPC action/query、编辑草稿、表格列、展示选项和 helper，以及这些模块的测试。feature 的 `server` 查询与命令、schema、规则、业务类型和非 UI 转换仍留在 feature。
3. **保留模块接口，不留兼容出口。** 尽量保留导出符号和搬迁后子目录关系。搬迁模块对保留业务契约的引用使用 `@/features/...`；所有消费者、mock 和路径断言改用新的 app 路径，然后删除旧 UI 路径。
4. **保持客户端与服务端边界。** 保留每个 `use client` 指令和当前动态加载方式。app UI 通过现有安全组合路径使用 feature server 操作；浏览器入口不得导入 server-only 模块。
5. **让边界可持续执行。** 更新 package-layer 规范和已有动态目录门禁，拒绝 feature 内新增浏览器 UI；通知邮件模板保留明确且窄的例外。

## 迁移映射

| 来源 | 目标 |
| --- | --- |
| `src/features/comment/admin/comment-actions*` | `src/app/admin/(dashboard)/comment/comment-actions*` |
| `src/features/comment/admin/options*` | `src/app/admin/(dashboard)/comment/options*` |
| `src/features/category/admin/**` (excluding shared `CategoryFormDialog` and `category-title*`) | `src/app/admin/(dashboard)/post/category/components/**` |
| `src/features/category/admin/components/CategoryFormDialog/**` | `src/app/admin/(dashboard)/components/CategoryFormDialog/**` |
| `src/features/category/admin/category-title*` | `src/app/admin/(dashboard)/post/edit/components/category-title*` |
| `src/features/comment/admin/**` (excluding `comment-actions*` and `options*`) | `src/app/admin/(dashboard)/comment/components/**` |
| `src/features/dashboard/admin/**` | `src/app/admin/(dashboard)/dashboard/components/**` |
| `src/features/link/admin/link-actions*` | `src/app/admin/(dashboard)/link/link-actions*` |
| `src/features/link/admin/**` (excluding `link-actions*`) | `src/app/admin/(dashboard)/link/components/**` |
| `src/features/media/admin/media-actions*` | `src/app/admin/(dashboard)/media/media-actions*` |
| `src/features/media/admin/**` (excluding `media-actions*` and shared editor/media UI) | `src/app/admin/(dashboard)/media/components/**` |
| `src/features/media/admin/components/{EditorMediaProvider,MediaPageShell,PhotoPicker}/**` | `src/app/admin/(dashboard)/components/{EditorMediaProvider,MediaPageShell,PhotoPicker}/**` |
| `src/features/media/admin/components/PhotoPickerItem/**` | `src/app/admin/(dashboard)/post/edit/components/PhotoPickerItem/**` |
| `src/features/menu/admin/menu-actions*` | `src/app/admin/(dashboard)/menu/menu-actions*` |
| `src/features/menu/admin/**` (excluding `menu-actions*`) | `src/app/admin/(dashboard)/menu/components/**` |
| `src/features/page/admin/edit/page-editor-actions*` | `src/app/admin/(dashboard)/page/edit/page-editor-actions*` |
| `src/features/page/admin/edit/**` (excluding `page-editor-actions*`) | `src/app/admin/(dashboard)/page/edit/components/**` |
| `src/features/page/admin/list/**` | `src/app/admin/(dashboard)/page/list/components/**` |
| `src/features/page/admin/options*` | `src/app/admin/(dashboard)/page/options*` |
| `src/features/page/admin/publication-status-tone*` | `src/app/admin/(dashboard)/page/list/components/publication-status-tone*` |
| `src/features/post/admin/edit/**` | `src/app/admin/(dashboard)/post/edit/components/**` |
| `src/features/post/admin/list/**` | `src/app/admin/(dashboard)/post/list/components/**` |
| `src/features/post/admin/options*` | `src/app/admin/(dashboard)/post/options*` |
| `src/features/post/admin/publication-status-tone*` | `src/app/admin/(dashboard)/post/list/components/publication-status-tone*` |
| `src/features/setting/admin/**` (excluding `use-site-setting*`) | `src/app/admin/(dashboard)/setting/components/**` |
| `src/features/tag/admin/**` | `src/app/admin/(dashboard)/tag/components/**` |
| `src/features/user/admin/account-security/**` | `src/app/admin/(dashboard)/account/security/components/**` |
| `src/features/user/admin/user-actions*` | `src/app/admin/(dashboard)/user/user-actions*` |
| `src/features/user/admin/options*` | `src/app/admin/(dashboard)/user/options*` |
| `src/features/user/admin/**` (excluding account security, `UserDropdown/**`, `use-current-user*`, `user-actions*` and `options*`) | `src/app/admin/(dashboard)/user/components/**` |
| `src/features/<feature>/public/**` | `src/app/(blog)/components/features/<feature>/public/**` |
| `src/features/user/admin/UserDropdown/**` | `src/app/admin/components/AdminLayout/UserDropdown/**` |
| `src/features/user/admin/use-current-user*` | `src/app/admin/(dashboard)/providers/use-current-user*` |
| `src/features/setting/admin/use-site-setting*` | `src/app/admin/(dashboard)/providers/use-site-setting*` |
| `src/features/user/login/components/LoginClient/**` | `src/app/admin/login/components/LoginClient/**` |
| `src/features/user/login/provider-icons.tsx` | `src/app/admin/login/components/provider-icons.tsx` |
| `src/features/category/admin/page.tsx` | `src/app/admin/(dashboard)/post/category/page.tsx` |
| `src/features/tag/admin/page.tsx` | `src/app/admin/(dashboard)/tag/page.tsx` |
| `src/features/page/admin/list/page.tsx` | `src/app/admin/(dashboard)/page/list/page.tsx` |
| `src/features/post/admin/edit/page.tsx` | `src/app/admin/(dashboard)/post/edit/page.tsx` |
| `src/features/user/admin/account-security/page.tsx` | `src/app/admin/(dashboard)/account/security/page.tsx` |

上表把后台浏览器代码拆到各自真实路由；跨页面复用的分类表单、媒体 provider、媒体页面壳和媒体选择器直接放在 dashboard 根 `components` 下。`PhotoPickerItem` 仅供文章编辑使用，随文章编辑路由归属；业务 action 和 options 位于所属路由根，`components` 目录保留 UI 组件。其余浏览器消费者、测试、mock、夹具和路径断言均已更新到对应的 app 目标。`src/features/comment/notifications/templates/` 下的 React Email 模板继续保留。

考虑过将迁移后的代码放入 `src/components`，但该目录用于通用 UI，会模糊业务界面和通用组件的归属；也考虑过把后台 UI 集中在路由组根目录下的 `components/features`，但该目录不能清楚表达实际路由所有权。路由专属 UI 放入真实消费者路由的 `components`，跨页面共享组件直接放在 dashboard 根 `components`；业务 action、options 和其他路由逻辑放在所属路由根或业务 feature。架构检查会确保这些目录不引入 App Router 入口文件，并拒绝 dashboard 根 `components` 下的 `features` 和业务目录。

## Risks / Trade-offs

- **搬迁后相对导入可能指向错误位置。** 尽量保留子树结构；对留在 feature 的模块引用改用明确 alias，并逐项检查旧路径。
- **client 边界可能意外改变。** 尽量原样保留指令和动态加载，检查路由入口及依赖方向。
- **UI 邻接 helper 可能包含业务语义。** 按导出与消费者分类；server 行为和非 UI 业务转换留在 feature。
- **配置或夹具中可能硬编码旧路径。** 搜索当前代码与脚本并更新消费者，不保留兼容转导出。

## Migration Plan

1. 清点 UI 模块、导出、消费者、测试、动态加载和展示配置，按实际后台路由建立逐路径映射。
2. 搬迁实现与 UI 测试，更新消费者、mock、夹具和配置路径；后台 UI 分到各自 dashboard 路由的 `components`，跨页面共享组件直接放 dashboard 根 `components`，删除旧 UI 文件及 dashboard 根集中式 `components/features`。
3. 更新 `package-layer-architecture`、架构门禁、`src/features/README.md` 和前端结构说明；确保 app 下的 `components` 目录不包含 App Router 入口文件。
4. 检查改动、旧路径和 RSC/client 指令。本次按用户验证范围不运行测试或验证命令。

可通过整体回退本次迁移恢复；没有数据或公开 URL 迁移。

## Open Questions

无。范围限定为浏览器 UI；邮件渲染继续归通知功能。
