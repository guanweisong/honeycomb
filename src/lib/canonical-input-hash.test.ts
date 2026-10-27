import { describe, expect, it } from "vitest";
import { hashCanonicalInput } from "@/lib/canonical-input-hash";

describe("creation intent canonical hash compatibility", () => {
  it("keeps recursive key sorting, locale ordering, undefined omission and Unicode bytes", () => {
    const first = {
      z: 0,
      é: null,
      omitted: undefined,
      a: [3, null, "中", { b: false, a: '"\n' }],
    };
    const reordered = {
      a: [3, null, "中", { a: '"\n', b: false }],
      é: null,
      z: 0,
    };
    const golden =
      "431882a4d3436b65dfbc687c036dbaf118b60642814a08541feb7386e131112e";
    expect(hashCanonicalInput(first)).toBe(golden);
    expect(hashCanonicalInput(reordered)).toBe(golden);
  });
  it.each([null, undefined])("preserves null fallback for %s", (value) => {
    expect(hashCanonicalInput(value)).toBe(
      "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
    );
  });
  it("retains explicit undefined array entries as null instead of filtering them", () => {
    expect(hashCanonicalInput([undefined, null])).toBe(
      "95cb9b4f84ceff132cc7a875d8c192bf4997016a939ee64141c1fd628c0e8738",
    );
  });
  it("hashes raw HTML rather than sanitizing original intent", () => {
    expect(
      hashCanonicalInput({ title: "原文", content: "<script>bad()</script>" }),
    ).toBe("808e827b4fe211bea425ffd5a33f4141dd64dc15c535b78238c6e4a999a3d3da");
  });
  it("retains array ordering and distinguishes omitted from null fields", () => {
    expect(hashCanonicalInput({ a: [1, 2] })).not.toBe(
      hashCanonicalInput({ a: [2, 1] }),
    );
    expect(hashCanonicalInput({ a: undefined })).not.toBe(
      hashCanonicalInput({ a: null }),
    );
  });
});
