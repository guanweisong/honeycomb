import { Resend } from "resend";
import AdminCommentEmailMessage from "@/packages/trpc/server/components/EmailMessage/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "@/packages/trpc/server/components/EmailMessage/ReplyCommentEmailMessage";

type EmailType = "ADMIN_NOTICE" | "REPLY_NOTICE";

interface EmailPayload {
    setting: any; // 使用 any 以适配实际的 schema.setting 类型
    currentComment: any;
    parentComment?: any;
}

/**
 * 发送邮件通知
 * @param type - 邮件类型：ADMIN_NOTICE（管理员通知）或 REPLY_NOTICE（回复通知）
 * @param payload - 邮件数据载体
 */
export async function sendEmail(type: EmailType, payload: EmailPayload) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { setting, currentComment, parentComment } = payload;

    const siteNameZh = setting.siteName?.zh ?? "";
    const systemEmail = `notice@guanweisong.com`;
    const adminEmail = process.env.ADMIN_EMAIL || "guanweisong@gmail.com";

    try {
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
            throw new Error("Invalid email type");
        }
    } catch (error) {
        console.error("Email send error:", error);
        throw error;
    }
}
