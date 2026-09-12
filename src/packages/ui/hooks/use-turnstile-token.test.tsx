import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useTurnstileToken } from "./use-turnstile-token";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("stores successful tokens and resets both token and widget", async () => {
  const reset = vi.fn();

  function Harness() {
    const ref = useRef({ reset });
    const captcha = useTurnstileToken(ref);
    return (
      <>
        <span>{captcha.token ?? "empty"}</span>
        <button onClick={() => captcha.onSuccess("token")}>success</button>
        <button onClick={captcha.reset}>reset</button>
      </>
    );
  }

  await act(async () => root.render(<Harness />));
  await act(async () => container.querySelectorAll("button")[0]?.click());
  expect(container.querySelector("span")?.textContent).toBe("token");

  await act(async () => container.querySelectorAll("button")[1]?.click());
  expect(container.querySelector("span")?.textContent).toBe("empty");
  expect(reset).toHaveBeenCalledOnce();
});
