import { act } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { expect, it } from "vitest";
import { Form } from "@/components/ui/form";
import { PostType } from "@/features/post/types/post.type";
import { PostTypeFields } from "@/features/post/admin/edit/components/PostTypeFields/index";

function QuoteForm() {
  const form = useForm({
    defaultValues: {
      quoteContent: { zh: "话语", en: "Quote" },
      quoteAuthor: { zh: "作者", en: "Author" },
    },
  });
  return (
    <Form {...form}>
      <PostTypeFields type={PostType.QUOTE} />
    </Form>
  );
}

it("names both quote fields in both languages without changing their values", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<QuoteForm />));
    for (const locale of ["zh", "en"]) {
      if (locale === "en") {
        for (const tab of container.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]',
        )) {
          if (tab.textContent === "en")
            await act(async () =>
              tab.dispatchEvent(
                new MouseEvent("mousedown", { bubbles: true, button: 0 }),
              ),
            );
        }
      }
      for (const [name, label, value] of [
        ["quoteContent", "引用正文", locale === "zh" ? "话语" : "Quote"],
        ["quoteAuthor", "引用作者", locale === "zh" ? "作者" : "Author"],
      ]) {
        const input = container.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(`[name="${name}.${locale}"]`);
        expect(input?.value).toBe(value);
        expect(
          document.getElementById(input?.getAttribute("aria-labelledby") ?? "")
            ?.textContent,
        ).toBe(label);
      }
    }
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
