> 后续说明（2026-10-21）：本提案保留生命周期方案的历史身份，不再作为当前普通媒体协议的同步来源。当前协议以 [simplify-media-registration](../simplify-media-registration/proposal.md) 和[媒体主规格](../../specs/media-lifecycle/spec.md)为准；条款名称映射见 [clarify-names-and-ownership](../clarify-names-and-ownership/specs/media-lifecycle/spec.md)。下文不改写当时设计。

## Why

现有上传可将客户端任意对象 key/元数据登记为可用媒体，且公开最终 key 的预签名 PUT/DELETE 仍可修改已发布字节。删除先操作对象后删除数据库记录，丢失恢复依据。

## What Changes

- 保留 20 MiB 直传，临时 key 与服务端独占候选 key 分离，单次复制后验证候选字节。
- 增加四态媒体生命周期、人工查询/核对和持久删除墓碑，不增加任务、租约、outbox 或全量引用平台。
- 已知封面/正文引用阻止删除，删除要求明确接受未知历史/外部引用风险。
- 历史记录 READY 且 verifiedAt 为空，仅新上传提供字节验证保证。

## Capabilities

### New Capabilities
- `media-lifecycle`: 不可覆盖候选、验证发布、可恢复删除、受控引用校验和人工恢复。

### Modified Capabilities

## Impact

媒体 schema、迁移 0007、存储适配、媒体 API/后台选择器，以及文章/页面事务内引用校验。旧客户端上传端点移除，发布需统一切换写入端。无生产迁移或存储运行授权。
