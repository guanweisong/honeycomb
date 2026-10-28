## Why

后台列表在横向滚动时，关键列会离开视野，难以持续核对记录身份或状态。通用表格需要提供按列固定到左侧或右侧的能力，让各管理页能直接在列定义中声明布局。

## What Changes

- 为 DataTable 列元数据增加左固定、右固定配置。
- 让表头和对应数据单元格在横向滚动时保持固定，并支持同侧多列堆叠。
- DataTable 存在 `rowActions` 时始终将操作列固定在右侧。
- 固定数据列与行选择框、行操作列共存时避免遮挡。

## Capabilities

### New Capabilities
- `admin-datatable-column-pinning`: 后台通用表格按列固定到左右两侧。

### Modified Capabilities

## Impact

- 影响 `src/components/DataTable` 的列类型、表头和表体呈现。
- 不增加依赖；保持现有 DataTable props 和筛选元数据契约。
