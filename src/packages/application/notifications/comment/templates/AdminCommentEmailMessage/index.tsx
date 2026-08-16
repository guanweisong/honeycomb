import { Link, Text } from "@react-email/components";
import * as React from "react";
import EmailContainer from "../EmailContainer";
import {
  getCommentTarget,
  type CommentNotification,
  type CommentNotificationSetting,
} from "../../comment-notification";

type AdminMessageEmailProps = {
  currentComment: CommentNotification;
  setting: CommentNotificationSetting;
};

const AdminCommentEmailMessage = (props: AdminMessageEmailProps) => {
  const { currentComment, setting } = props;
  const previewText = `${setting.siteName?.zh}有一条新的评论`;
  const { postTitle, postLink } = getCommentTarget(currentComment);

  return (
    <EmailContainer
      setting={setting}
      previewText={previewText}
      header={<Text>管理员，您好</Text>}
      footer={
        <Text>
          您可以点击 <Link href={postLink}>查看完整的回复内容</Link>
        </Text>
      }
    >
      <>
        <Text>
          {currentComment.author}在[{setting.siteName?.zh}]的文章[{postTitle}
          ]上发表了新的评论:
        </Text>
        <Text className="border-2 border-dashed border-gray-300 bg-gray-100 p-2 whitespace-pre-wrap">
          {currentComment.content}
        </Text>
      </>
    </EmailContainer>
  );
};

export default AdminCommentEmailMessage;
