/**
 * 根据自定义 ID 获取自定义评论链接信息。
 * @param {string | null} [customId] - 自定义评论的 ID。
 * @returns {{ id: string; title: { zh: string; en: string; }; } | undefined} 自定义评论链接信息或 undefined。
 */
export const getCustomCommentLink = (customId?: string | null) => {
  if (customId === process.env.LINK_OBJECT_ID) {
    return {
      id: customId,
      title: {
        zh: "比邻",
        en: "Links",
      },
    };
  }
};
