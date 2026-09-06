/**
 * 将 JSON-LD 序列化为可安全嵌入 `<script>` 的文本。
 * 转义 `<` 可阻止存储内容提前闭合脚本标签，同时不改变 JSON 解析结果。
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
