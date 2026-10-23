# 根文件迁移验证记录

## 基线与边界

- 基线：7f088b73648a506f3a7f8fc5dc07e8e0dd1a948e，tree 6531ac22e0f86c84bb239039e8c24028d8dabac7。
- 独立本地分支 refactor/root-file-ownership；无提交、推送、PR、合并或部署。
- Node 24.22.1、Bun 1.4.3、Next 16.4.2；锁文件安装，不升级依赖。
- 8 项文件迁移：6 个 PWA 文件逐字节相同；sitemap 仅加 server-only；跨边界恢复测试仅改 3 个 import。原 13 个保留根文件逐字节未变。
- 测试文件库存 484 → 484（按迁移映射归一化）；断言、参数矩阵与钩子未删除。新增 1 个 worker 源/输出路径契约及 1 个 server-only 参数入口；E2E 清单仍 27 文件 67 用例。

## 已通过

- 路径契约先失败：缺少新 Bun entrypoint；迁移后定向 5 文件 43 用例通过。
- 类型检查：113 秒；lint：111 秒。
- 普通架构测试：22 文件 279 用例通过，31 秒。
- 串行 process：6 文件 103 用例通过，84 秒；包括 server-only、覆盖率路径/门槛和类型感知 lint 门禁。
- 生产 build：97 秒，生成 public/serwist/sw.js（约 49 KB），包含 /en/offline 预缓存与 fallback。公开 URL、scope 与响应头未改；这不替代真实离线浏览器验证。
- quality:spec：严格验证 74/74 项通过；git diff --check 通过。
- 冻结后的源码/配置在上述验证期间无变化。此记录与任务状态更新仅为文档，之后再次验证规格和 diff。
- 验证使用随机独占 file: 数据库与合成环境、哨兵 token；无生产数据库。迁移/seed 成功，退出 trap 已删除本次目录，并独立确认无残留。未启动 E2E 服务。

## 全量覆盖率未通过

一次完整 test:unit:coverage 执行 1329 秒，报告 446 文件通过、3 文件失败；3157 用例通过、3 用例失败，另外 2 个 worker 启动错误。

三条失败均为既有 5000ms 限制下超时，而不是断言结果不符：

- DynamicForm/field-accessibility：text 控件标签/验证消息。
- category/admin/page：105 行完整树一次请求批量删除。
- comment-notification：post 邮件两个模板保留已验证目标链接。

Avatar 与 editor/media-picker 的 worker 响应启动超时，首次没有完成这两个文件。上述源码与测试不在本轮行为改动范围。

随后用原断言、原 5000ms 阈值、保留文件隔离，仅将本地命令 maxWorkers 设为 1，定向重跑上述 5 文件：27/27 用例通过，31.56 秒。没有修改仓库测试配置、扩大排除或跳过用例。

此复验没有启用 coverage，且不是完整套件重跑，因此不能据此宣称完整覆盖率门禁通过；初次运行没有产出可采信的完整覆盖报告。具体超时成因尚未证明，不能只凭复验通过断言一定是机器资源不足。

## 生产 PWA E2E 未运行

Playwright 1.64.1 指定的 Chrome 156.0.8078.4 / build 1248 下载失败，官方完整 Chrome 和仅 headless-shell 两条受支持安装路线均返回截断或无效 ZIP（缺少 central directory）。未替换项目配置、未借系统 Chromium 冒充指定版本通过。

真实 worker 注册、离线导航 fallback 和生产浏览器隐私缓存验收仍待可用浏览器环境验证。67 个 E2E 用例保留，不降低此验收要求。

## 后续

本轮仅本地工作。发布需另行明确授权；发布前或后续可用环境需重新取得完整覆盖率及生产 PWA E2E 证据，不沿用旧 master CI 或把本地定向结果当作全套通过。
