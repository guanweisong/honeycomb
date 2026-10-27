// @vitest-environment node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { utcFormat } from "@/lib/ui/utc-format";

describe("utcFormat", () => {
  it("formats the UTC day rather than the input timezone's calendar day", () => {
    expect(utcFormat("2026-01-01T01:02:03+08:00")).toBe("2025-12-31");
  });

  it("preserves supported dayjs tokens and time fields", () => {
    expect(utcFormat("2026-02-03T04:05:06Z", "YY/M/D HH:mm:ss")).toBe(
      "26/2/3 04:05:06",
    );
  });

  it("preserves literal text and numeric date-fns aliases", () => {
    expect(
      utcFormat(
        "2026-02-03T16:05:06.007Z",
        "[YYYY] yyyy/MM/dd 'at' hh:mm:ss.SSS a xx",
      ),
    ).toBe("YYYY 2026/02/03 at 04:05:06.007 PM +0000");
  });

  it("preserves existing named month and weekday date-fns formats", () => {
    expect(utcFormat("2026-02-03T04:05:06Z", "EEEE, MMMM do yyyy")).toBe(
      "Tuesday, February 3rd 2026",
    );
  });

  it("returns an empty string for invalid input", () => {
    expect(utcFormat("not-a-date")).toBe("");
  });
});

describe("UTC format host-timezone independence", () => {
  it.each(["UTC", "America/New_York", "Pacific/Apia"])(
    "preserves UTC fields under %s",
    (timezone) => {
      const moduleUrl = pathToFileURL(resolve("src/lib/ui/utc-format.ts")).href;
      const result = spawnSync(
        process.execPath,
        [
          // Explicitly enable stripping for this TypeScript-only Node subprocess.
          "--experimental-strip-types",
          "--input-type=module",
          "-e",
          `
      import { utcFormat } from ${JSON.stringify(moduleUrl)};
      console.log(JSON.stringify([
        utcFormat("2026-03-08T02:30:00Z", "YYYY-MM-DD HH:mm"),
        utcFormat("2011-12-30T12:00:00Z"),
        utcFormat("0007-02-03T04:05:06Z"),
        utcFormat("2026-01-01T01:02:03+08:00"),
        utcFormat("not-a-date"),
        utcFormat("2026-02-03T04:05:06Z", "'year' YYYY 'day' DD")
      ]));
    `,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, TZ: timezone },
          timeout: 15000,
          killSignal: "SIGKILL",
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        "2026-03-08 02:30",
        "2011-12-30",
        "0007-02-03",
        "2025-12-31",
        "",
        "year 2026 day 03",
      ]);
    },
    20000,
  );
});

describe("UTC format deterministic prerendering", () => {
  it.each(["UTC", "America/New_York", "Pacific/Apia"])(
    "never reads the current time for fixed input under %s",
    (timezone) => {
      const moduleUrl = pathToFileURL(resolve("src/lib/ui/utc-format.ts")).href;
      const result = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "--input-type=module",
          "-e",
          `
          const NativeDate = Date;
          globalThis.Date = new Proxy(NativeDate, {
            construct(target, args, newTarget) {
              if (args.length === 0) throw new Error("Unexpected current-time Date constructor");
              return Reflect.construct(target, args, newTarget);
            },
            get(target, key, receiver) {
              if (key === "now") return () => { throw new Error("Unexpected Date.now"); };
              return Reflect.get(target, key, receiver);
            }
          });
          const { utcFormat } = await import(${JSON.stringify(moduleUrl)});
          console.log(JSON.stringify([
            utcFormat("2026-03-08T02:30:00Z", "YYYY-MM-DD HH:mm"),
            utcFormat("2011-12-30T12:00:00Z"),
            utcFormat("0007-02-03T04:05:06Z"),
            utcFormat("not-a-date"),
            utcFormat("2026-02-03T04:05:06Z", "EEEE, MMMM do yyyy"),
            utcFormat("2026-02-03T16:05:06.007Z", "[YYYY] yyyy/MM/dd 'at' hh:mm:ss.SSS a xx")
          ]));
          `,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, TZ: timezone },
          timeout: 15000,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        "2026-03-08 02:30",
        "2011-12-30",
        "0007-02-03",
        "",
        "Tuesday, February 3rd 2026",
        "YYYY 2026/02/03 at 04:05:06.007 PM +0000",
      ]);
    },
    20000,
  );

  it.each(["module", "commonjs"])(
    "preserves explicit and zero-argument UTC constructors in %s",
    (moduleType) => {
      const result = spawnSync(
        process.execPath,
        [
          `--input-type=${moduleType}`,
          "-e",
          `
          Date.now = () => 1770091506007;
          const { UTCDate, UTCDateMini } = ${moduleType === "module" ? 'await import("@date-fns/utc")' : 'require("@date-fns/utc")'};
          console.log(JSON.stringify([UTCDate, UTCDateMini].map(Constructor => [
            new Constructor().getTime(),
            new Constructor("2026-02-03T04:05:06Z").toISOString(),
            new Constructor(2026, 1, 3, 4, 5, 6).toISOString(),
            Number.isNaN(new Constructor("invalid").getTime())
          ])));
          `,
        ],
        { encoding: "utf8", timeout: 15000 },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(
        Array.from({ length: 2 }, () => [
          1770091506007,
          "2026-02-03T04:05:06.000Z",
          "2026-02-03T04:05:06.000Z",
          true,
        ]),
      );
    },
  );
});
