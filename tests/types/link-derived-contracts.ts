import type { LinkRecord } from "@/features/link/types/link.record";
import type { EnableStatus } from "@/lib/validation/enable-status";

// Independent pre-refactor oracle: never infer the expected fields from the DB.
type PreviousLinkRecord = {
  id: string;
  url: string;
  name: string;
  logo: string;
  description: string | null;
  status: EnableStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
};
type Equal<L, R> =
  (<T>() => T extends L ? 1 : 2) extends <T>() => T extends R ? 1 : 2
    ? (<T>() => T extends R ? 1 : 2) extends <T>() => T extends L ? 1 : 2
      ? true
      : false
    : false;
type Expect<T extends true> = T;
type Shape<T> = { [Key in keyof T]: T[Key] };
export type LinkReadContracts = [
  Expect<Equal<Shape<LinkRecord>, PreviousLinkRecord>>,
  Expect<LinkRecord extends PreviousLinkRecord ? true : false>,
  Expect<PreviousLinkRecord extends LinkRecord ? true : false>,
  Expect<Equal<keyof LinkRecord, keyof PreviousLinkRecord>>,
  Expect<
    Equal<"futurePrivateColumn" extends keyof LinkRecord ? true : false, false>
  >,
  Expect<
    Equal<
      string extends NonNullable<LinkRecord["status"]> ? true : false,
      false
    >
  >,
];
