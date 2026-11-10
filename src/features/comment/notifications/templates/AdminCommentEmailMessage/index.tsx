import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import * as React from "react";
import { clientEnv } from "@/env/client";
import {
  getCommentTarget,
  type CommentNotification,
  type CommentNotificationSetting,
} from "@/features/comment/notifications/comment-notification";

type AdminMessageEmailProps = {
  currentComment: CommentNotification;
  setting: CommentNotificationSetting;
};

const AdminCommentEmailMessage = (props: AdminMessageEmailProps) => {
  const { currentComment, setting } = props;
  const { postTitle, postLink } = getCommentTarget(currentComment);
  const previewText = currentComment.customId
    ? postTitle
    : `${setting.siteName?.zh}有一条新的评论`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="my-auto mx-auto font-sans">
          <Container
            style={{
              borderTop: "10px solid #eee",
              borderImage:
                "repeating-linear-gradient(-45deg,transparent 0,transparent 1em,#ffc9c7 0,#ffc9c7 2em ,#dcedff 0,#dcedff 4em) 20",
            }}
            className="my-[20px] shadow-md bg-white mx-auto p-[20px] max-w-4xl"
          >
            <Heading className="text-black text-[20px] font-normal text-left">
              <Text>管理员，您好</Text>
            </Heading>
            {currentComment.customId ? (
              <Text>
                {postTitle}，{currentComment.author}发表了新的评论:
              </Text>
            ) : (
              <Text>
                {currentComment.author}在[{setting.siteName?.zh}]的文章[
                {postTitle}
                ]上发表了新的评论:
              </Text>
            )}
            <Text className="border-2 border-dashed border-gray-300 bg-gray-100 p-2 whitespace-pre-wrap">
              {currentComment.content}
            </Text>
            <Hr />
            <Section
              className="text-gray-500 bg-no-repeat bg-right bg-contain"
              style={{
                backgroundImage: `url(${clientEnv.NEXT_PUBLIC_SITE_URL}/static/images/logo.192.png)`,
              }}
            >
              {postLink ? (
                <Text>
                  您可以点击 <Link href={postLink}>查看完整的回复内容</Link>
                </Text>
              ) : undefined}
              <Text>欢迎再次光临 {setting.siteName?.zh}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AdminCommentEmailMessage;
