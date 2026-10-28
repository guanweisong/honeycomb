## ADDED Requirements

### Requirement: 后台表格列可配置固定方向

后台通用 DataTable SHALL 允许列定义通过 `meta.pin` 配置为 `"left"` 或 `"right"`。未配置此字段的列 SHALL 保持普通横向滚动行为；现有列筛选元数据和 DataTable 公开 props SHALL 保持兼容。

#### Scenario: 左侧固定一列
- **WHEN** 列定义的 `meta.pin` 为 `"left"` 且用户横向滚动表格
- **THEN** 该列的表头和数据单元格 SHALL 固定在表格可视区域左侧

#### Scenario: 右侧固定一列
- **WHEN** 列定义的 `meta.pin` 为 `"right"` 且用户横向滚动表格
- **THEN** 该列的表头和数据单元格 SHALL 固定在表格可视区域右侧

#### Scenario: 未配置固定方向
- **WHEN** 列定义没有 `meta.pin`
- **THEN** 该列 SHALL 按现有自动宽度和横向滚动行为呈现
- **AND** 既有筛选元数据及表格 props SHALL 继续有效

### Requirement: 多个固定列按实际宽度堆叠

DataTable SHALL 支持左右两侧分别固定多个列。固定列 SHALL 按其现有列顺序排列，偏移 SHALL 与实际渲染宽度一致；同一侧的固定列不得互相覆盖，表头与对应数据单元格 SHALL 对齐。

#### Scenario: 左右两侧有多个固定列
- **WHEN** 多个列分别配置为左固定或右固定且表格发生横向滚动
- **THEN** 同侧固定列 SHALL 按列顺序连续排列且不得重叠
- **AND** 每个固定列表头 SHALL 与其数据单元格保持相同偏移

#### Scenario: 固定列宽度发生变化
- **WHEN** 内容或布局变化导致固定列实际渲染宽度改变
- **THEN** 后续固定列的偏移 SHALL 更新以匹配新的实际宽度

#### Scenario: 右固定列组显示边界
- **WHEN** 表格包含一个或多个右固定数据列，或只有固定在右侧的操作列
- **AND** 横向滚动容器右侧仍有未显示内容
- **THEN** 右固定列组最左侧的单元格 SHALL 显示轻微左阴影
- **AND** 同组其他固定列 SHALL 不显示该边界阴影

#### Scenario: 右固定列到达横向滚动末端
- **WHEN** 表格包含右固定列且横向滚动容器已到达最右端
- **THEN** 右固定列组 SHALL 隐藏左阴影

### Requirement: 选择框固定于左侧并为左固定数据列留位

当 DataTable 启用 `selectableRows` 时，选择单元格 SHALL 始终固定在最左侧。左固定数据列 SHALL 从选择单元格之后开始排列且不得重叠；存在左固定数据列时，最后一个左固定数据列 SHALL 在右缘显示轻微阴影。

#### Scenario: 仅有选择框可固定
- **WHEN** `selectableRows` 为真且没有左固定数据列
- **AND** 横向滚动容器存在可向右滚动的内容
- **THEN** 选择框表头及单元格 SHALL 固定在最左侧
- **AND** 选择框列 SHALL 显示轻微右阴影

#### Scenario: 左侧固定组到达横向滚动起点
- **WHEN** 表格包含选择框或左固定数据列且横向滚动容器位于最左端
- **THEN** 左固定列组 SHALL 隐藏右阴影

#### Scenario: 可选择列表启用左固定列
- **WHEN** `selectableRows` 为真且至少有一列固定在左侧
- **THEN** 选择框单元格 SHALL 固定在最左侧，左固定数据列 SHALL 从选择框之后开始排列
- **AND** 横向滚动容器左侧仍有已滚出视口的内容时，最后一列左固定数据列 SHALL 在右缘显示轻微阴影

#### Scenario: 左固定数据列显示右边界
- **WHEN** 一个或多个数据列配置为左固定，无论是否启用 `selectableRows`
- **AND** 横向滚动容器左侧仍有已滚出视口的内容
- **THEN** 左固定组最右侧单元格 SHALL 在右缘显示轻微阴影

### Requirement: 行操作列始终固定在右侧

当 DataTable 提供 `rowActions` 时，操作列表头及每一行的操作单元格 SHALL 固定在横向滚动区域最右侧，与任何右固定数据列分开堆叠。此行为 SHALL 不要求配置 `meta.pin`。

#### Scenario: 仅配置行操作列
- **WHEN** DataTable 提供 `rowActions` 且没有数据列配置 `meta.pin`
- **THEN** 操作列表头及每一行操作单元格 SHALL 在横向滚动时保持在最右侧

#### Scenario: 右固定数据列与行操作列并存
- **WHEN** DataTable 提供 `rowActions` 且至少一列配置为右固定
- **THEN** 操作列 SHALL 位于最右侧，右固定数据列 SHALL 按列顺序排列在操作列之前
- **AND** 操作列、固定数据列的偏移 SHALL 按实际渲染宽度计算且不得重叠

#### Scenario: DataTable 未提供行操作
- **WHEN** DataTable 未提供 `rowActions`
- **THEN** 操作列 SHALL 不渲染，未固定的数据列 SHALL 保持普通横向滚动
