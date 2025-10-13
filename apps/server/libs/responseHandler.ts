import { NextResponse } from "next/server";

/**
 * 统一的 API 响应处理类。
 * 提供了一系列静态方法，用于生成标准格式的成功、错误、禁止访问、未找到和未授权的 HTTP 响应。
 * 所有的响应都以 `NextResponse` 格式返回，并包含 `code`, `message`, `data` 等字段。
 */
class ResponseHandler {
  /**
   * 生成一个成功的 API 响应。
   * @param {object} [options] - 响应选项。
   * @param {string} [options.message='操作成功'] - 成功的消息。
   * @param {any} [options.data] - 响应数据。
   * @param {number} [options.code=0] - 响应状态码，0 表示成功。
   * @returns {NextResponse} 包含成功状态和数据的 NextResponse 对象。
   */
  static Success({ message = "操作成功", data, code = 0 } = {}) {
    return NextResponse.json({ code, message, data });
  }

  /**
   * 生成一个错误的 API 响应。
   * @param {object} [options] - 响应选项。
   * @param {string} [options.message='操作失败'] - 错误的消息。
   * @param {any} [options.data] - 响应数据。
   * @param {number} [options.code=1] - 响应状态码，1 表示通用错误。
   * @returns {NextResponse} 包含错误状态和数据的 NextResponse 对象。
   */
  static Error({ message = "操作失败", data, code = 1 } = {}) {
    return NextResponse.json({ code, message, data });
  }

  /**
   * 生成一个禁止访问 (403 Forbidden) 的 API 响应。
   * @param {object} [options] - 响应选项。
   * @param {string} [options.message='无权访问'] - 禁止访问的消息。
   * @param {any} [options.data] - 响应数据。
   * @param {number} [options.code=403] - 响应状态码，403 表示禁止访问。
   * @returns {NextResponse} 包含禁止访问状态和数据的 NextResponse 对象。
   */
  static Forbidden({ message = "无权访问", data, code = 403 } = {}) {
    return NextResponse.json({ code, message, data }, { status: 403 });
  }

  /**
   * 生成一个未找到 (404 Not Found) 的 API 响应。
   * @param {object} [options] - 响应选项。
   * @param {string} [options.message='资源不存在'] - 未找到的消息。
   * @param {any} [options.data] - 响应数据。
   * @param {number} [options.code=404] - 响应状态码，404 表示资源不存在。
   * @returns {NextResponse} 包含未找到状态和数据的 NextResponse 对象。
   */
  static NotFound({ message = "资源不存在", data, code = 404 } = {}) {
    return NextResponse.json({ code, message, data }, { status: 404 });
  }

  /**
   * 生成一个未授权 (401 Unauthorized) 的 API 响应。
   * @param {object} [options] - 响应选项。
   * @param {string} [options.message='未授权'] - 未授权的消息。
   * @param {any} [options.data] - 响应数据。
   * @param {number} [options.code=401] - 响应状态码，401 表示未授权。
   * @returns {NextResponse} 包含未授权状态和数据的 NextResponse 对象。
   */
  static Unauthorized({ message = "未授权", data, code = 401 } = {}) {
    return NextResponse.json({ code, message, data }, { status: 401 });
  }
}

export default ResponseHandler;