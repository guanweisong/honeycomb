import { expect, it } from "vitest";
import { parseSessionList } from "./session-contract";

it("rejects malformed remote session rows", () => {
  expect(() => parseSessionList([{ id: "session", createdAt: 42 }])).toThrow();
});

it("accepts server dates and serialized session timestamps", () => {
  const sessions = [
    {
      id: "session",
      createdAt: "1780000000000",
      expiresAt: new Date("2026-01-01"),
      ipAddress: null,
    },
  ];
  expect(parseSessionList(sessions)).toEqual(sessions);
});
