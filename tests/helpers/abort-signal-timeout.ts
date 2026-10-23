import { vi } from "vitest";

/** 让原生超时信号跟随测试时钟；调用者负责恢复 mock 和清理计时器。 */
export function mockAbortSignalTimeout(message: string) {
  vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException(message, "TimeoutError")),
      delay,
    );
    return controller.signal;
  });
}
