import { customType } from "drizzle-orm/sqlite-core";

export const dateField = (name: string) =>
  customType<{ data: Date; driverData: string }>({
    dataType() {
      return "text"; // SQLite 里存储为 TEXT
    },
    toDriver(value: Date): string {
      return value.toISOString(); // 写入时
    },
    fromDriver(value: string): Date {
      return new Date(value); // 读出时
    },
  })(name);
