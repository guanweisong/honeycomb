import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import AdminCommentEmailMessage from "@/packages/trpc/server/components/EmailMessage/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "@/packages/trpc/server/components/EmailMessage/ReplyCommentEmailMessage";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // 明确指定 Node.js Runtime

const resend = new Resend(env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // 简单的安全验证，防止未授权调用
    // 在生产环境中，建议使用更安全的机制，如 JWT 或 API Key
    const authHeader = req.headers.get("x-secret-key");
    if (authHeader !== env.JWT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, payload } = body;
    const { setting, currentComment, parentComment } = payload;

    const siteNameZh = setting.siteName?.zh ?? "";
    const systemEmail = `notice@guanweisong.com`;
    const adminEmail = process.env.ADMIN_EMAIL || "guanweisong@gmail.com"; // Fallback or env

    if (type === "ADMIN_NOTICE") {
      await resend.emails.send({
        from: systemEmail,
        to: adminEmail,
        subject: `[${siteNameZh}]有一条新的评论`,
        react: AdminCommentEmailMessage({
          // @ts-ignore
          currentComment,
          // @ts-ignore
          setting,
        }),
      });
    } else if (type === "REPLY_NOTICE") {
      if (parentComment && parentComment.email) {
        await resend.emails.send({
          from: systemEmail,
          to: parentComment.email,
          subject: `您在[${siteNameZh}]的评论有新的回复`,
          react: ReplyCommentEmailMessage({
            // @ts-ignore
            currentComment,
            // @ts-ignore
            setting,
            // @ts-ignore
            parentComment,
          }),
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
