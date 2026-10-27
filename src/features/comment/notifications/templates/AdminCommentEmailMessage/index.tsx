import { Link, Text } from "react-email";
import * as React from "react";
import EmailContainer from "@/features/comment/notifications/templates/EmailContainer";
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
    <EmailContainer
      setting={setting}
      previewText={previewText}
      header={<Text>管理员，您好</Text>}
      footer={
        postLink ? (
          <Text>
            您可以点击 <Link href={postLink}>查看完整的回复内容</Link>
          </Text>
        ) : undefined
      }
    >
      <>
        {currentComment.customId ? (
          <Text>
            {postTitle}，{currentComment.author}发表了新的评论:
          </Text>
        ) : (
          <Text>
            {currentComment.author}在[{setting.siteName?.zh}]的文章[{postTitle}
            ]上发表了新的评论:
          </Text>
        )}
        <Text className="border-2 border-dashed border-gray-300 bg-gray-100 p-2 whitespace-pre-wrap">
          {currentComment.content}
        </Text>
      </>
    </EmailContainer>
  );
};

export default AdminCommentEmailMessage;
