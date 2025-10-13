/**
 * 分页响应接口。
 * 定义了分页查询结果的通用结构。
 * @template T - 列表中元素的类型。
 */
export default interface PaginationResponse<T> {
  /**
   * 数据列表。
   */
  list: T[];
  /**
   * 总记录数。
   */
  total: number;
}
