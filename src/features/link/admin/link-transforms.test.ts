import { EnableStatus } from "@/lib/validation/enable-status";
import { describe, expect, it } from "vitest";

import type { LinkRecord as LinkEntity } from "@/features/link/types";

import { toLinkFormDefaults } from "./link-transforms";

const link = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} satisfies LinkEntity;

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
});
