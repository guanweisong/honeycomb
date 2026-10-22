# 组件归属迁移记录

## 基线与范围

本地 d39e2bcca412c6b9fe93763f96f3c6100367eeb1 与远端 454f38c33d433aecbdbf683ed8dab34e220d4c60 共享 tree 517783d972b2024bbd691f8dd332d63543bc1751。旧组件方案基于 tree 28a8a9ae；本轮选中 66 文件与最新基线逐字节一致，之前 rules/schema 整理完整保留。

仅实施 P01/P03/P04/P05/P06/P07/P08。原 29 个实现、31 个测试、6 个 SVG 归位为 30 个实现、32 个测试、同样 6 个 SVG；64 个源文件机械移动，2 个发布颜色源文件分别拆为两业务文件。所有消费者、mock、门禁与当前说明同时更新。两套 Providers、PostInfo/Align 不迁移、不合并；类型派生优化不混入本轮。

## 逐文件映射

| 项目 | 原文件                                                                             | 当前文件                                                                                                           |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P01  | src/app/(blog)/components/BackToTop/index.test.tsx                                 | src/app/(blog)/_components/BackToTop/index.test.tsx                                                                |
| P01  | src/app/(blog)/components/BackToTop/index.tsx                                      | src/app/(blog)/_components/BackToTop/index.tsx                                                                     |
| P01  | src/app/(blog)/components/BackToTop/scroll-integration.test.tsx                    | src/app/(blog)/_components/BackToTop/scroll-integration.test.tsx                                                   |
| P01  | src/app/(blog)/components/Breadcrumb/index.test.tsx                                | src/app/(blog)/_components/Breadcrumb/index.test.tsx                                                               |
| P01  | src/app/(blog)/components/Breadcrumb/index.tsx                                     | src/app/(blog)/_components/Breadcrumb/index.tsx                                                                    |
| P01  | src/app/(blog)/components/Footer/index.test.tsx                                    | src/app/(blog)/_components/Footer/index.test.tsx                                                                   |
| P01  | src/app/(blog)/components/Footer/index.tsx                                         | src/app/(blog)/_components/Footer/index.tsx                                                                        |
| P01  | src/app/(blog)/components/Header/index.test.tsx                                    | src/app/(blog)/_components/Header/index.test.tsx                                                                   |
| P01  | src/app/(blog)/components/Header/index.tsx                                         | src/app/(blog)/_components/Header/index.tsx                                                                        |
| P01  | src/app/(blog)/components/LanguageSwitcher/img/en.light.svg                        | src/app/(blog)/_components/LanguageSwitcher/img/en.light.svg                                                       |
| P01  | src/app/(blog)/components/LanguageSwitcher/img/en.svg                              | src/app/(blog)/_components/LanguageSwitcher/img/en.svg                                                             |
| P01  | src/app/(blog)/components/LanguageSwitcher/img/zh.light.svg                        | src/app/(blog)/_components/LanguageSwitcher/img/zh.light.svg                                                       |
| P01  | src/app/(blog)/components/LanguageSwitcher/img/zh.svg                              | src/app/(blog)/_components/LanguageSwitcher/img/zh.svg                                                             |
| P01  | src/app/(blog)/components/LanguageSwitcher/index.test.tsx                          | src/app/(blog)/_components/LanguageSwitcher/index.test.tsx                                                         |
| P01  | src/app/(blog)/components/LanguageSwitcher/index.tsx                               | src/app/(blog)/_components/LanguageSwitcher/index.tsx                                                              |
| P01  | src/app/(blog)/components/Menu/index.test.tsx                                      | src/app/(blog)/_components/Menu/index.test.tsx                                                                     |
| P01  | src/app/(blog)/components/Menu/index.tsx                                           | src/app/(blog)/_components/Menu/index.tsx                                                                          |
| P01  | src/app/(blog)/components/NoData/index.test.tsx                                    | src/app/(blog)/[locale]/list/[...slug]/_components/NoData/index.test.tsx                                           |
| P01  | src/app/(blog)/components/NoData/index.tsx                                         | src/app/(blog)/[locale]/list/[...slug]/_components/NoData/index.tsx                                                |
| P01  | src/app/(blog)/components/PageTitle/index.test.tsx                                 | src/app/(blog)/_components/PageTitle/index.test.tsx                                                                |
| P01  | src/app/(blog)/components/PageTitle/index.tsx                                      | src/app/(blog)/_components/PageTitle/index.tsx                                                                     |
| P01  | src/app/(blog)/components/ThemeProvider/index.test.tsx                             | src/app/(blog)/_components/ThemeProvider/index.test.tsx                                                            |
| P01  | src/app/(blog)/components/ThemeProvider/index.tsx                                  | src/app/(blog)/_components/ThemeProvider/index.tsx                                                                 |
| P01  | src/app/(blog)/components/ThemeSwitcher/index.test.tsx                             | src/app/(blog)/_components/ThemeSwitcher/index.test.tsx                                                            |
| P01  | src/app/(blog)/components/ThemeSwitcher/index.tsx                                  | src/app/(blog)/_components/ThemeSwitcher/index.tsx                                                                 |
| P01  | src/app/admin/(dashboard)/components/AdminClientShell/index.test.tsx               | src/app/admin/(dashboard)/_components/AdminClientShell/index.test.tsx                                              |
| P01  | src/app/admin/(dashboard)/components/AdminClientShell/index.tsx                    | src/app/admin/(dashboard)/_components/AdminClientShell/index.tsx                                                   |
| P01  | src/app/admin/(dashboard)/components/AdminClientShell/logout-browser-state.test.ts | src/app/admin/(dashboard)/_components/AdminClientShell/logout-browser-state.test.ts                                |
| P01  | src/app/admin/(dashboard)/components/AdminClientShell/logout-browser-state.ts      | src/app/admin/(dashboard)/_components/AdminClientShell/logout-browser-state.ts                                     |
| P01  | src/app/admin/components/AdminLayout/AdminSidebar.tsx                              | src/app/admin/_components/AdminLayout/AdminSidebar.tsx                                                             |
| P01  | src/app/admin/components/AdminLayout/index.test.ts                                 | src/app/admin/_components/AdminLayout/index.test.ts                                                                |
| P01  | src/app/admin/components/AdminLayout/index.tsx                                     | src/app/admin/_components/AdminLayout/index.tsx                                                                    |
| P01  | src/app/admin/components/AdminLayout/menu-title.test.ts                            | src/app/admin/_components/AdminLayout/menu-title.test.ts                                                           |
| P01  | src/app/admin/components/AdminLayout/menu-title.ts                                 | src/app/admin/_components/AdminLayout/menu-title.ts                                                                |
| P01  | src/app/admin/components/AdminNavigation/NavigationItem.test.ts                    | src/app/admin/_components/AdminNavigation/NavigationItem.test.ts                                                   |
| P01  | src/app/admin/components/AdminNavigation/NavigationItem.tsx                        | src/app/admin/_components/AdminNavigation/NavigationItem.tsx                                                       |
| P01  | src/app/admin/components/AdminNavigation/index.test.ts                             | src/app/admin/_components/AdminNavigation/index.test.ts                                                            |
| P01  | src/app/admin/components/AdminNavigation/index.tsx                                 | src/app/admin/_components/AdminNavigation/index.tsx                                                                |
| P05  | src/components/admin/MultiLangText/img/en.svg                                      | src/components/MultiLangText/img/en.svg                                                                            |
| P05  | src/components/admin/MultiLangText/img/zh.svg                                      | src/components/MultiLangText/img/zh.svg                                                                            |
| P05  | src/components/admin/MultiLangText/index.test.tsx                                  | src/components/MultiLangText/index.test.tsx                                                                        |
| P05  | src/components/admin/MultiLangText/index.tsx                                       | src/components/MultiLangText/index.tsx                                                                             |
| P06  | src/components/admin/date-time.test.ts                                             | src/lib/ui/admin-date-time.test.ts                                                                                 |
| P06  | src/components/admin/date-time.ts                                                  | src/lib/ui/admin-date-time.ts                                                                                      |
| P07  | src/components/admin/publication-status-tone.test.ts                               | src/features/post/admin/publication-status-tone.test.ts<br>src/features/page/admin/publication-status-tone.test.ts |
| P07  | src/components/admin/publication-status-tone.ts                                    | src/features/post/admin/publication-status-tone.ts<br>src/features/page/admin/publication-status-tone.ts           |
| P03  | src/components/blog/Card/index.test.tsx                                            | src/components/SectionCard/index.test.tsx                                                                          |
| P03  | src/components/blog/Card/index.tsx                                                 | src/components/SectionCard/index.tsx                                                                               |
| P04  | src/components/blog/TextDivider/index.test.tsx                                     | src/features/post/public/components/PostList/TextDivider.test.tsx                                                  |
| P04  | src/components/blog/TextDivider/index.tsx                                          | src/features/post/public/components/PostList/TextDivider.tsx                                                       |
| P08  | src/features/media/components/EditorMediaProvider/index.tsx                        | src/features/media/admin/components/EditorMediaProvider/index.tsx                                                  |
| P08  | src/features/media/components/PhotoPicker/accessibility.test.tsx                   | src/features/media/admin/components/PhotoPicker/accessibility.test.tsx                                             |
| P08  | src/features/media/components/PhotoPicker/index.test.tsx                           | src/features/media/admin/components/PhotoPicker/index.test.tsx                                                     |
| P08  | src/features/media/components/PhotoPicker/index.tsx                                | src/features/media/admin/components/PhotoPicker/index.tsx                                                          |
| P08  | src/features/media/components/PhotoPickerItem/index.test.tsx                       | src/features/media/admin/components/PhotoPickerItem/index.test.tsx                                                 |
| P08  | src/features/media/components/PhotoPickerItem/index.tsx                            | src/features/media/admin/components/PhotoPickerItem/index.tsx                                                      |
| P08  | src/features/media/shared/MediaGrid/index.test.tsx                                 | src/features/media/admin/components/MediaGrid/index.test.tsx                                                       |
| P08  | src/features/media/shared/MediaGrid/index.tsx                                      | src/features/media/admin/components/MediaGrid/index.tsx                                                            |
| P08  | src/features/media/shared/MediaPageShell/index.test.tsx                            | src/features/media/admin/components/MediaPageShell/index.test.tsx                                                  |
| P08  | src/features/media/shared/MediaPageShell/index.tsx                                 | src/features/media/admin/components/MediaPageShell/index.tsx                                                       |
| P08  | src/features/media/shared/media-actions.test.ts                                    | src/features/media/admin/media-actions.test.ts                                                                     |
| P08  | src/features/media/shared/media-actions.ts                                         | src/features/media/admin/media-actions.ts                                                                          |
| P08  | src/features/media/shared/media-query.integration.test.tsx                         | src/features/media/admin/media-query.integration.test.tsx                                                          |
| P08  | src/features/media/shared/media-query.test.ts                                      | src/features/media/admin/media-query.test.ts                                                                       |
| P08  | src/features/media/shared/media-query.ts                                           | src/features/media/admin/media-query.ts                                                                            |
| P08  | src/features/media/shared/media-upload-outcomes.test.ts                            | src/features/media/admin/media-upload-outcomes.test.ts                                                             |

## 行为与边界

- 41 个 page/layout/template/route 等框架入口原位保留，路由和 URL 不变；NoData 仅归列表路由。
- SectionCard 保留原 Card/CardProps 导出名称、JSX 和样式，不添加 client 指令，仍供 RSC 与客户端评论共享。
- MultiLangText 唯一新增明确 use client 指令；语言切换、缺省回退和两个 SVG 不变，其余原有 RSC/client 指令保持。
- post/page 各自 publicationStatusToneMap 保留三种字符串键及颜色：PUBLISHED→GREEN、DRAFT→GRAY、TO_AUDIT→AMBER；分别引用自己的状态 enum，StatusBadge 保持共享。
- media/admin 收拢只改变路径，原查询/上传/删除/取消/选择行为、导出、动态加载保持。通用 editor 仍仅定义媒体 renderer，由 EditorMediaProvider 注入，不反向依赖 feature。
- 日期工具保留本地时间与无效值行为，不与 UTC/account-security 格式化合并；未新增通用 fixture、barrel 或假想共享抽象。

## 测试库存与等价性

30 个纯移动测试原有 156 个展开用例、132 个测试声明、411 个 expect、38 个 hooks 全部保留。完整测试文件 AST（含 fixture、参数、mock）按真实模块路径规范化后一致，展开 fullName 多重集合一致。

原 P07 的 1 用例/1 个完整对象断言拆为两业务各 4 用例/4 expect：各自保留同一完整对象预期，再增加三种状态的独立检查。真实错误颜色注入曾使 8/8 用例失败，恢复原颜色后全部通过。业务范围合计由 31 文件/157 用例变为 32 文件/164 用例，仅 P07 增加 7；不把新增架构门禁混算成业务回归。

基线 1090 个源码/资源中，除 P07 两份拆分源和两个有意增强的架构门禁外，1077 个 TS/TSX 模块的语义 AST 等价，比较包含导出、JSX、断言与指令，仅规范化真实模块路径并单独核准 MultiLangText client 指令。9 份非 TS 资源/样式逐字节一致，其中迁移 SVG 为 6 份。

## 门禁与文档

新增 component-ownership 检查具体归属、SectionCard/MultiLangText 边界、媒体 renderer 注入和各业务发布状态来源。既有 feature/library 直接及间接依赖门禁继续生效，不增宽 allowlist。app shell 测试发现器迁到 _components，并断言发现结果非空；媒体 UI 对 transport outputs 的专项限制迁到 media/admin，同时新增两个拒绝和一个允许 fixture，先红后绿验证。

旧路径只在禁止回归测试、迁移对照及冻结历史中保留。目录模板、阅读地图、工程 Skill 和当前架构说明同步；历史审计文件不机械改写。Vitest 隔离、worker、coverage 范围/阈值、CI 和数据库实现均未调整。

## 验证口径

执行类型、Lint、目标回归、完整架构、非 E2E 覆盖率及 process、生产构建和严格规格检查；需要数据库的阶段只使用本轮独占临时本地 SQLite 并验证清理。浏览器可执行文件缺失时，只核验清单并明确标记未执行，不绕过既有下载阻塞，也不以结构迁移宣称 CI 性能收益。

## 最终本地结果

- 类型和 Lint 通过；22 个架构文件/267 用例通过。最终覆盖率通道 449 文件/3139 用例、process 6 文件/102 用例，合计 455 文件/3241 用例。对照基线 3227，用例增加 14：业务颜色检查 +7，归属和依赖门禁 +7，没有删减原回归。
- 最终覆盖率：statements 6431/6897（93.24%），branches 4164/4708（88.44%），functions 1886/2027（93.04%），lines 6007/6365（94.37%）。逐文件对照没有漏计文件；分支/函数分子分母不变。新增 client 指令和第二份颜色映射均覆盖；仅媒体 provider 的更长导入路径换行使行分母再增加 1，原有未覆盖逻辑未增加，故行百分比由 94.38% 显示为 94.37%，不为维持数字改动格式或覆盖口径。
- 最终轮覆盖率实际 118.94 秒、process 36.51 秒、生产构建约 18 秒；全部 70 项严格规格检查通过。准备、迁移及首轮纠错时间不冒充测试耗时，也不将单次耗时波动当作 CI 性能收益。
- 首轮发现的认证渲染 fixture 两处旧路径已同步，原 13 个断言和精确 mock 边界不变；文档齐备后定向 7 用例及完整回归均重跑通过。
- 两次运行各自独占的临时 SQLite 目录均已核验删除。开发 66/生产 1 项 E2E 仅检查可发现性；当前 Chromium/Firefox/WebKit 可执行文件缺失，真实浏览器与视觉回归未执行，既有下载限制未绕过。
