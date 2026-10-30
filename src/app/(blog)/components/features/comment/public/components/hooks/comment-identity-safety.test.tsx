import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useCommentIdentity } from "@/app/(blog)/components/features/comment/public/components/hooks/use-comment-identity";

it.each(['{"author":42,"email":"bad"}', "{invalid"])(
  "ignores malformed saved identity %s",
  async (stored) => {
    localStorage.setItem("user", stored);
    const element = document.createElement("div");
    const root = createRoot(element);
    function Harness() {
      const { identity } = useCommentIdentity();
      return <span>{identity ? "stored" : "anonymous"}</span>;
    }
    try {
      await act(async () => root.render(<Harness />));
      expect(element.textContent).toBe("anonymous");
    } finally {
      await act(async () => root.unmount());
      localStorage.removeItem("user");
    }
  },
);

it.each(["getItem", "setItem", "removeItem"] as const)(
  "keeps in-memory identity usable when localStorage.%s throws",
  async (operation) => {
    const element = document.createElement("div");
    const root = createRoot(element);
    let current: ReturnType<typeof useCommentIdentity> | undefined;
    const storedIdentity = { author: "Alice", email: "alice@example.test" };
    function Harness() {
      current = useCommentIdentity();
      return <span>{current.identity?.author ?? "anonymous"}</span>;
    }
    const storageFailure = () => {
      throw new DOMException("Storage denied", "SecurityError");
    };
    const readSpy =
      operation === "getItem"
        ? vi
            .spyOn(Storage.prototype, "getItem")
            .mockImplementation(storageFailure)
        : undefined;
    let writeSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      await act(async () => root.render(<Harness />));
      expect(element.textContent).toBe("anonymous");
      if (operation === "setItem")
        writeSpy = vi
          .spyOn(Storage.prototype, "setItem")
          .mockImplementation(storageFailure);
      await act(async () => {
        expect(() => current?.persistIdentity(storedIdentity)).not.toThrow();
      });
      expect(element.textContent).toBe("Alice");
      if (operation === "removeItem")
        writeSpy = vi
          .spyOn(Storage.prototype, "removeItem")
          .mockImplementation(storageFailure);
      await act(async () => {
        expect(() => current?.clearIdentity()).not.toThrow();
      });
      expect(element.textContent).toBe("anonymous");
    } finally {
      readSpy?.mockRestore();
      writeSpy?.mockRestore();
      await act(async () => root.unmount());
      localStorage.removeItem("user");
    }
  },
);
