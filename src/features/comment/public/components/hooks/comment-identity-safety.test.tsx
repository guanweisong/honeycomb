import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useCommentIdentity } from "./use-comment-identity";

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
