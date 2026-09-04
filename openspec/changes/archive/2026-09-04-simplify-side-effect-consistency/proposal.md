## Why

评论已写入后通知读取失败仍会让 API 返回失败，可能诱发重复提交；媒体删除先删数据库再删对象存储，R2 失败后会留下无法追踪的孤儿对象。需要用最小同步编排修正成功语义和可重试性，而不引入 Outbox、队列或定时任务。

## What Changes

- 评论创建以数据库提交结果为成功边界，通知准备和邮件发送失败只记录脱敏日志。
- 媒体删除由 Application Use Case 协调对象存储与 Repository。
- 媒体先删除对象存储文件，再删除数据库记录；外部删除失败时保留记录以供重试。
- 将 S3 依赖从数据库 Repository 中移出，暴露最小存储端口和待删除对象读取契约。
- 覆盖通知失败、R2 失败、数据库失败和幂等重试测试。
- 明确不增加新表、Cron、Outbox 或外部队列。

## Capabilities

### New Capabilities

- `side-effect-consistency`: 定义评论通知 best-effort 语义和媒体删除的同步可重试顺序。

### Modified Capabilities

无。

## Impact

- 影响 Comment、Media 的 Application、Infrastructure、Router 和相关测试。
- 评论与媒体公开 tRPC 输入输出保持兼容；失败语义会变得更准确。
- 不改变数据库 schema，不引入新基础设施服务。
