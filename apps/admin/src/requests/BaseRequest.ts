/**
 * 基础请求响应接口。
 * 定义了所有 API 响应的基本结构。
 * @template T - 响应数据体的类型。
 */
export default interface BaseRequest<T> {
  /**
   * HTTP 状态码。
   */
  status: number;
  /**
   * 响应数据体。
   */
  data: T;
}
