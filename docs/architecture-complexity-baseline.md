# 架构复杂度基线

> 历史记录：本文的旧目录、规范、计数和验证仅适用于当时版本，不作为当前架构要求或本轮验证结果。2026-10-20 起当前指导见[架构与依赖边界](architecture-dependency-report.md)及[代码阅读地图](code-reading-map.md)。

本基线对应 `reduce-architecture-complexity` 变更，记录迁移前的可量化指标。指标用于比较趋势，不作为脱离职责的机械拆分依据。

## 规模指标

| 指标                      |                                    基线 |
| ------------------------- | --------------------------------------: |
| `src` 文件数              |                                     679 |
| `src` TypeScript/TSX 行数 |                               约 46,080 |
| 业务 feature 数           | 10 个业务模块，另有 1 个 contracts 目录 |
| 路由页面                  |                                      25 |
| layout                    |                                       5 |
| route handler             |                                       5 |
| 组件入口                  |                                      73 |
| 测试文件                  |                                     208 |
| 数据库迁移                |                                      14 |
| 数据表定义                |                                      17 |
| 生产文件超过 600 行       |                                       0 |

## 当前治理入口

以上仅保留当时的规模测量，不再维护旧分层预算。当前职责、文件规模和自动化要求以[架构与依赖边界](architecture-dependency-report.md)、[代码阅读地图](code-reading-map.md)和 repository skills 为准。

当前业务写入由所属 feature 的 server 函数直接访问数据库；不要求 Application Use Case、Repository 接口或人工 domain/infrastructure 层。后续迁移的规模对照和验证结果应单独记录，不覆盖或借用本历史表格。
