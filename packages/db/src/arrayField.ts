import { customType } from "drizzle-orm/sqlite-core";

export function arrayField<T = string>(name: string) {
  return customType<{ data: T[]; driverData: string }>({
    dataType() {
      return "text";
    },
    toDriver(value: T[]): string {
      return JSON.stringify(value || []);
    },
    fromDriver(value: string): T[] {
      if (!value) return [];
      return JSON.parse(value);
    },
  })(name);
}
