import { describe, expect, it } from "vitest";

import type { LinkEntity } from "@/packages/trpc/api/outputs";

import { buildLinkUpdateInput, toLinkFormDefaults } from "./linkTransforms";

const link = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: "ENABLE",
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} as LinkEntity;

describe("link transforms", () => {
  it("maps nullable list DTO fields to edit defaults without inventing values", () => {
    expect(toLinkFormDefaults(undefined)).toBeUndefined();
    expect(toLinkFormDefaults(link)).toEqual({
      id: "link-1",
      name: "OpenAI",
      url: "https://openai.com",
      logo: "https://openai.com/logo.png",
      description: undefined,
      status: "ENABLE",
    });
  });

  it("forces update payloads to use the selected link id", () => {
    expect(
      buildLinkUpdateInput(link, {
        id: "forged-id",
        name: "Updated OpenAI",
      }),
    ).toEqual({ id: "link-1", name: "Updated OpenAI" });
  });
});
