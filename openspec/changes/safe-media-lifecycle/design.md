## Context

采用 R2 S3 兼容 API。CopyObject、HeadObject、GetObject 可用；不假设候选目标 create-only COPY、对象版本或锁。部署的权限与图片运行时尚需发布前验证。

## Goals / Non-Goals

目标是验证后发布同一不可再次写入的候选字节，并保留原 key 对账。非目标是私有媒体、全量引用、自动恢复/清理或不破坏所有历史引用的承诺。

## Decisions

一个媒体行只有一个候选 key。事务 CAS copyStartedAt 后最多发送一次 COPY；SDK maxAttempts=1。后续确认只检查该候选；READY 不再复制。占位后崩溃且候选不存在时只能再次核对或新建上传，旧行保留。所有存储操作在事务外。

实际内容通过受限 GET 与 Sharp 全帧解码验证，最多 20 MiB、40M 总像素和 100 帧。候选绑定以 UPLOADING 条件更新完成。上传声明和客户端元数据不是证明。

删除先在事务内检查已知引用并整批变为 DELETING，再删除和 HEAD，确认缺失才标记 DELETED。未知结果保持原 key。返回提交成功与缓存刷新退化分离。

## Risks / Trade-offs

历史 READY verifiedAt=null；未改变历史对象。旧一小时签名仍有能力，发布必须停止旧写入并等待已签名能力失效，不以删除临时对象代表凭证失效。外部持有的账户级写权限不在应用不可变性保证内。公开 CDN 缓存和已经下载的媒体不能立即撤回。

## Migration Plan

0007 在同一迁移事务内重建 media 为精确 Drizzle 结构；保存全部已知入站 post.cover_id 到专用辅助表，复制全部历史字段并设 READY，替换后恢复封面再移除辅助表，未来默认 UPLOADING。通过实际 Drizzle migrator（foreign_keys=ON）验证全链、历史字段/封面/文章版本与时间戳保留和恢复失败时完整回滚；另运行真实迁移治理比较列顺序及当前 schema 结构，不依赖只检查索引/CHECK 的子集测试。不得直接回退旧写代码；没有生产应用迁移。

> 后续协议说明（2026-10-21）：本文保留当时的四态方案与验收记录，不是当前实现指引。当前普通媒体协议已由 `simplify-media-registration` 取代，以 [媒体主规格](../../specs/media-lifecycle/spec.md)为准；不得按本文恢复生命周期、墓碑或 COPY/HEAD 恢复流程。历史任务勾选和测试记录不代表当前提交的验证。
