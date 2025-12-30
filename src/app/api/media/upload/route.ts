import { NextRequest, NextResponse } from "next/server";
import S3 from "@/packages/trpc/server/libs/S3";
import sizeOf from "image-size";
import { getColor } from "@/packages/trpc/server/libs/colorThief";
import dayjs from "dayjs";
import { InferInsertModel } from "drizzle-orm";
import * as schema from "@/packages/db/schema";
import { getDb } from "@/packages/db/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const db = getDb();
  try {
    const authHeader = req.headers.get("x-secret-key");
    if (authHeader !== process.env.JWT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, size, type, base64 } = body;

    const fileBuffer = Buffer.from(base64, "base64");
    const ext = name.split(".").pop();
    const key = `${dayjs().format("YYYY/MM/DD/HHmmssSSS")}.${ext}`;

    const url = await S3.putObject({
      Key: key,
      Body: fileBuffer,
      ContentType: type,
    });

    const data: InferInsertModel<typeof schema.media> = {
      name,
      size,
      type,
      key,
      url,
    };

    if (type?.startsWith("image")) {
      try {
        const dim = sizeOf(fileBuffer);
        data.width = dim.width ?? null;
        data.height = dim.height ?? null;
      } catch (err) {
        console.warn("Failed to get image size", err);
      }

      try {
        const color = await getColor(url);
        data.color = `rgb(${color.join(",")})`;
      } catch (err) {
        console.warn("Failed to get image main color", err);
      }
    }

    const [result] = await db.insert(schema.media).values(data).returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
