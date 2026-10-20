import { describe, expect, it } from "vitest";

import { createStaticOfflineDocument } from "./offline-document";

describe("static offline document", () => {
  it("移除 Next 水合脚本并保留页面内容与响应元数据", async () => {
    const response = new Response(
      '<!doctype html><main role="alert">You\'re offline</main><script src="/_next/app.js"></script><script>self.__next_f=[]</script>',
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-length": "123",
          "x-offline": "yes",
        },
      },
    );

    const result = await createStaticOfflineDocument(response);
    const html = await result.text();

    expect(html).toContain("You're offline");
    expect(html).not.toContain("<script");
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toContain("text/html");
    expect(result.headers.get("content-length")).toBeNull();
    expect(result.headers.get("x-offline")).toBe("yes");
  });
});
