import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 读取环境变量
const client = createClient({
  // url: process.env.TURSO_URL!,
  url: "libsql://honeycomb-guanweisong.aws-ap-northeast-1.turso.io",
  // authToken: process.env.TURSO_TOKEN!,
  authToken:
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTg2MzU3NTksImlkIjoiZGQwMTE2MTEtNThiNi00YzEyLWJhNjMtMmIxMzY2NzdhYWRiIiwicmlkIjoiZDkxZDdiOTctYmQ1Ni00NzU2LTgwODMtYzk5ZjE4MWUzYjM3In0.dd-Zgp4MzgtURejP-8VWLtjLdkYQzDK5-1A-R9RWQJR8_-O_TOPqjKY3YspvWWzRYRL-aEvISYUpx4V-TzvuCw",
});

const dbInstance = drizzle(client, { schema });

export const db = dbInstance;
