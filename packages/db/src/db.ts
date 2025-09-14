import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { createDbTablesProxy } from "./helpers";

// 读取环境变量
const client = createClient({
  // url: process.env.TURSO_URL!,
  url: "libsql://honeycomb-guanweisong.aws-ap-northeast-1.turso.io",
  // authToken: process.env.TURSO_TOKEN!,
  authToken:
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc3NzEyMjUsImlkIjoiNmFlMDM4MjItMGE2OC00OTY4LWI2Y2MtNmQwYmI3MGNlNzMzIiwicmlkIjoiMGIxYTNhZDctZDU0Mi00MzY0LThiYzAtYjU1Yzk5Mjg3ODlhIn0.9mie8Y2D-iitWW_Y487hGf8EMrtqGOHe3E26C3Ciw3H2_HBrwQboluCZbNq3DHqNZyNNowUmpOVQIjQiJ6I7DQ",
});

const dbInstance = drizzle(client, { schema });

export const db = {
  instance: dbInstance,
  tables: createDbTablesProxy(dbInstance),
};
