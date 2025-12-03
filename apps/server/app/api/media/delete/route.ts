import { NextRequest, NextResponse } from "next/server";
import { env } from "@honeycomb/env/index";
import S3 from "@honeycomb/trpc/server/libs/S3";
import * as schema from "@honeycomb/db/schema";
import { db } from "@honeycomb/db/db";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("x-secret-key");
        if (authHeader !== env.JWT_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ids } = body;

        // 1. 根据 IDs 从数据库中找出要删除的媒体对象
        const mediaToDelete = await db
            .select({
                key: schema.media.key,
            })
            .from(schema.media)
            .where(inArray(schema.media.id, ids));

        const keysToDelete = mediaToDelete
            .map((item) => item.key)
            .filter((key): key is string => !!key);

        // 2. 从数据库中删除记录
        await db
            .delete(schema.media)
            .where(inArray(schema.media.id, ids));

        // 3. 从 S3 中删除文件
        if (keysToDelete.length > 0) {
            await S3.deleteMultipleObject({
                Objects: keysToDelete.map((key) => ({ Key: key })),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Media delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
