import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useMounted } from "./use-mounted";

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

it("reports mounted after the client effect runs", async () => {
  function Harness() {
    return <span>{useMounted() ? "mounted" : "pending"}</span>;
  }

  await act(async () => root.render(<Harness />));

  expect(container.textContent).toBe("mounted");
});
