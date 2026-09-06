const SCRIPT_ELEMENT = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

/**
 * 将 Next.js 离线页面转换为不会触发客户端路由恢复的静态文档。
 * 浏览器仍保留预渲染内容和样式，重试由原生 form 提交完成。
 */
export async function createStaticOfflineDocument(
  response: Response,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response((await response.text()).replace(SCRIPT_ELEMENT, ""), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
