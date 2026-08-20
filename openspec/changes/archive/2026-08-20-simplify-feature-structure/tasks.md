# 任务

- [x] 盘点十个 feature 的目录、转发文件和 import 关系，建立迁移清单。
- [x] 为扁平化入口补充或调整 feature 边界测试，并验证旧内部路径不再被跨模块引用。
- [x] 迁移 category、setting、tag、link 的简单入口。
- [x] 迁移 menu、page、media 的简单入口，保留媒体共享 UI 契约。
- [x] 只合并 post、comment、user 中没有独立职责的转发目录，保留 domain 结构。
- [x] 删除确认无引用的空目录和兼容转发文件。
- [x] 更新架构报告、DDD 迁移说明和相关开发文档。
- [x] 执行类型检查、Lint、单元测试、边界测试、生产构建和 diff 检查。
