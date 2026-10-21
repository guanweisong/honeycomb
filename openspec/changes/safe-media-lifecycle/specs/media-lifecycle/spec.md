## ADDED Requirements

### Requirement: 上传确认发布不可再次覆盖的已验证候选
系统 SHALL 只向客户端签发临时 key PUT，持久记录单次候选复制尝试，校验候选真实大小、类型及完整图片内容后条件标记 READY。READY 再次确认 MUST NOT 重写对象。

#### Scenario: 临时对象被覆盖
- **WHEN** 客户端在确认前后更改临时 key 的内容
- **THEN** 最终发布的候选字节 MUST 已在服务端验证，确认过程不得再次复制覆盖该候选

#### Scenario: 复制结果未知
- **WHEN** COPY 超时且 HEAD 暂时不存在
- **THEN** 系统 MUST 保留 UPLOADING 与原候选 key，不把缺失当作写入不会稍后完成的证明

### Requirement: 删除保留恢复线索并保护已知引用
系统 SHALL 在同一写事务内检查已知引用并条件转为 DELETING，在事务外删除对象，确认缺失后保留 DELETED 墓碑。整批引用检查失败 MUST NOT 修改任何项。

#### Scenario: 内容保存与删除竞争
- **WHEN** 受控内容事务新增封面或受管正文引用与删除并发
- **THEN** 保存必须检查 READY，删除必须检查已知引用；不能在删除开始后通过受控保存新增引用

#### Scenario: 未知引用风险
- **WHEN** 管理员请求删除且没有发现已知引用
- **THEN** 系统 MUST 要求明确确认仍可能破坏未登记历史或外部引用，不声明完整引用保证

### Requirement: 历史兼容与人工恢复
系统 SHALL 保留历史 key/URL，历史记录 READY 且 verifiedAt 为空。后台必须区分可用/待确认/删除中并提供人工查询或核对，不承诺自动收敛。

#### Scenario: 旧数据迁移
- **WHEN** 应用生命周期迁移
- **THEN** 历史记录与封面关联保持不变，不能将它们标为已完成服务器字节验证

#### Scenario: 单次复制占位后崩溃
- **WHEN** 候选仍不存在且不能证明原复制未发出
- **THEN** 后续操作只能查询原候选或启动新上传，旧行继续保留，不复用候选 key

> 后续协议说明（2026-10-21）：本文保留当时的四态方案与验收记录，不是当前实现指引。当前普通媒体协议已由 `simplify-media-registration` 取代，以 [媒体主规格](../../../../specs/media-lifecycle/spec.md)为准；不得按本文恢复生命周期、墓碑或 COPY/HEAD 恢复流程。历史任务勾选和测试记录不代表当前提交的验证。
