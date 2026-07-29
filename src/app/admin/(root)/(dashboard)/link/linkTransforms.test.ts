import { describe, expect, it } from "vitest";

import { SortOrder } from "@/packages/trpc/api/schemas/pagination.query.schema";
import type { LinkEntity } from "@/packages/trpc/api/modules/link/types/link.entity";

import {
  buildLinkQueryParams,
  buildLinkUpdateInput,
  toLinkFormDefaults,
} from "./linkTransforms";

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
  it("preserves the exact replacement query input sent to link.adminIndex", () => {
    expect(
      buildLinkQueryParams({
        page: 3,
        limit: 25,
        name: "OpenAI",
        status: ["ENABLE"],
        sortField: "createdAt",
        sortOrder: SortOrder.desc,
      }),
    ).toEqual({
      page: 3,
      limit: 25,
      name: "OpenAI",
      status: ["ENABLE"],
      sortField: "createdAt",
      sortOrder: SortOrder.desc,
    });
    expect(buildLinkQueryParams({ name: "example" })).toEqual({
      name: "example",
    });
  });

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
