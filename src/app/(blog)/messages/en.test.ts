import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "./en.json";

const t = createTranslator({ locale: "en", messages });
describe("English count messages", () => {
  it.each([0, 1, 2])(
    "formats %i with English singular/plural rules",
    (count) => {
      expect(t("PostInfo.views", { count })).toBe(
        `${count} ${count === 1 ? "view" : "views"}`,
      );
      expect(t("PostInfo.messages", { count })).toBe(
        `${count} ${count === 1 ? "message" : "messages"}`,
      );
      expect(t("Comment.summary", { count })).toBe(
        `${count} ${count === 1 ? "message" : "messages"}`,
      );
    },
  );
});
