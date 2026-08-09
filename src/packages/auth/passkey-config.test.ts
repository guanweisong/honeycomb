import { describe, expect, it } from "vitest";
import { getPasskeyConfig } from "./passkey-config";

describe("Passkey configuration", () => {
  it("derives the RP ID and origin from the configured auth URL", () => {
    expect(getPasskeyConfig("https://www.guanweisong.com")).toEqual({
      rpID: "www.guanweisong.com",
      rpName: "guanweisong.com",
      origin: "https://www.guanweisong.com",
    });
  });
});
