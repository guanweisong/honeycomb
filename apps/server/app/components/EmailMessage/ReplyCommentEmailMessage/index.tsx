import { Link, Text } from "@react-email/components";
import * as React from "react";
import { Comment, Setting } from ".prisma/client";
import EmailContainer from "@/app/components/EmailMessage/Components/Container";
import { getPostOrPageOrCustomTitleAndLinkFromComment } from "@/libs/getPostOrPageOrCustomTitleAndLinkFromComment";

type ReplyMessageEmailProps = {
  currentComment: Comment;
  parentComment: Comment;
  setting: Setting;
};

const ReplyCommentEmailMessage = (props: ReplyMessageEmailProps) => {
  const { currentComment, parentComment, setting } = props;
  const previewText = `您在${setting.siteName?.zh}的评论有新的回复`;

  const { postTitle, postLink } =
    getPostOrPageOrCustomTitleAndLinkFromComment(parentComment);

  return (
    <EmailContainer
      setting={setting}
      previewText={previewText}
      header={<Text>{parentComment.author}，您好</Text>}
      children={
        <>
          <Text>
            您曾在[{setting.siteName?.zh}]的文章[{postTitle}]上发表评论:
          </Text>
          <Text className="border-2 border-dashed border-gray-300 bg-gray-100 p-2 whitespace-pre-wrap">
            {parentComment.content}
          </Text>
          <Text>{currentComment.author} 给您的回复如下:</Text>
          <Text className="border-2 border-dashed border-gray-300 bg-gray-100 p-2 whitespace-pre-wrap">
            {currentComment.content}
          </Text>
        </>
      }
      footer={
        <Text>
          您可以点击 <Link href={postLink}>查看完整的回复内容</Link>
        </Text>
      }
    />
  );
};

export default ReplyCommentEmailMessage;
